use std::{ops::Deref, sync::Arc};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use tokio::net::TcpListener;

use crate::{dap_client::UserRequest, dap_states::dap_state_machine::ProgramState};

pub struct Webserver {
    program_state_receiver: tokio::sync::watch::Receiver<ProgramState>,
    user_request_sender: tokio::sync::broadcast::Sender<UserRequest>,
}

#[derive(Clone)]
struct AppState {
    program_state: Arc<tokio::sync::watch::Receiver<ProgramState>>,
    request_sender: Arc<tokio::sync::broadcast::Sender<UserRequest>>,
}

impl Webserver {
    pub fn new(
        program_state_receiver: tokio::sync::watch::Receiver<ProgramState>,
        user_request_sender: tokio::sync::broadcast::Sender<UserRequest>,
    ) -> Self {
        Webserver {
            program_state_receiver,
            user_request_sender,
        }
    }

    pub async fn serve(self, address: impl tokio::net::ToSocketAddrs) -> anyhow::Result<()> {
        let state = AppState {
            program_state: Arc::new(self.program_state_receiver),
            request_sender: Arc::new(self.user_request_sender),
        };

        let listener = TcpListener::bind(address).await?;
        let app = build_app().with_state(state);

        tracing::info!("Server started on http://{}", listener.local_addr()?);
        axum::serve(listener, app).await?;

        Ok(())
    }
}

fn build_app() -> Router<AppState> {
    Router::new()
        .route("/", get(get_index))
        .nest("/api", build_api())
}

fn build_api() -> Router<AppState> {
    Router::new().route("/events", get(initialize_events_websocket))
}

async fn initialize_events_websocket(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| {
        handle_socket(
            socket,
            state.program_state.deref().clone(),
            state.request_sender.deref().clone(),
        )
    })
}

impl TryFrom<Message> for UserRequest {
    type Error = anyhow::Error;

    fn try_from(value: Message) -> Result<Self, Self::Error> {
        let request_bytes = match value {
            Message::Binary(bytes) => bytes,
            _ => anyhow::bail!("expected binary websocket message"),
        };

        let request_id = request_bytes
            .first()
            .ok_or(anyhow::anyhow!("invalid request: 0 bytes sent"))?;

        Ok(match request_id {
            1 => UserRequest::Step,
            _ => anyhow::bail!("unknown user request id: {}", request_id),
        })
    }
}

async fn handle_socket(
    mut socket: WebSocket,
    mut program_state: tokio::sync::watch::Receiver<ProgramState>,
    request_sender: tokio::sync::broadcast::Sender<UserRequest>,
) {
    loop {
        let serialized = serde_json::to_string(program_state.borrow_and_update().deref())
            .expect("ProgramState must not contain a Map with non-string keys");

        if socket.send(Message::Text(serialized.into())).await.is_err() {
            // websocket closed
            break;
        }

        tokio::select! {
            received = socket.recv() => {
                if let Some(message) = received.and_then(|result| result.ok()) {

                    // don't try and handle websocket control messages, we only care about the data
                    match message {
                        Message::Ping(..) | Message::Pong(..) => continue,
                        Message::Close(..) => break,
                        _ => (),
                    }

                    match UserRequest::try_from(message) {
                        Ok(request) => if request_sender.send(request).is_err() {
                            // dap server closed
                            break;
                        }
                        Err(err) => {
                            tracing::error!("Invalid UserRequest: {err}");
                        }
                    }
                } else {
                    // websocket closed or had some other error
                    break;
                }
            },
            change_result = program_state.changed() => {
                if change_result.is_err() {
                    // dap server closed
                    break;
                }
            }
        }
    }
}

#[cfg(debug_assertions)]
async fn get_index() -> Result<impl IntoResponse, StatusCode> {
    use axum::response::Redirect;
    Ok(Redirect::to("http://localhost:5173"))
}

#[cfg(not(debug_assertions))]
async fn get_index() -> Result<impl IntoResponse, StatusCode> {
    use axum::response::Html;
    Ok(Html(include_str!("../../../dist/index.html")))
}
