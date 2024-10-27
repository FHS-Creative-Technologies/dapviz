use std::{error::Error, io::Read as _, net::Ipv4Addr, sync::Arc};

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
use bytes::{Buf as _, BytesMut};
use clap::Parser as _;
use tokio::{
    io::{AsyncReadExt as _, AsyncWriteExt as _},
    net::{TcpListener, TcpStream, ToSocketAddrs},
    process::Command,
    sync::RwLock,
};

#[derive(clap::Parser)]
struct Args {
    #[arg(
        short,
        long,
        default_value = "0.0.0.0",
        help = "network address to listen on"
    )]
    address: String,

    #[arg(short, long, default_value_t = 80, help = "port to listen on")]
    port: u16,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    tracing_subscriber::fmt().init();

    let listener = TcpListener::bind((args.address, args.port)).await?;

    let dap_messages = Arc::new(RwLock::new(Vec::new()));
    let dap_notify = Arc::new(tokio::sync::Notify::new());

    let state = AppState {
        dap_messages: Arc::clone(&dap_messages),
        dap_notify: Arc::clone(&dap_notify),
    };

    let app = build_app().with_state(state);

    tracing::info!("Server started on http://{}", listener.local_addr()?);

    // do these things concurrently
    tokio::spawn(async move {
        start_dap_proxy(dap_messages, dap_notify)
            .await
            .expect("dap proxy failed :(")
    });
    axum::serve(listener, app).await?;

    Ok(())
}

type DapMessages = Arc<RwLock<Vec<DapEvent>>>;

#[derive(Clone)]
struct AppState {
    dap_messages: DapMessages,
    dap_notify: Arc<tokio::sync::Notify>,
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
            Arc::clone(&state.dap_messages),
            Arc::clone(&state.dap_notify),
        )
    })
}

async fn handle_socket(
    mut socket: WebSocket,
    messages: DapMessages,
    notify: Arc<tokio::sync::Notify>,
) {
    let mut last_message = 0;

    loop {
        // clone new messages into a vec, so we can drop the rwlock as fast as possible
        let new_messages = {
            let all_messages = messages.read().await;
            all_messages[last_message..].to_vec()
        };

        for message in new_messages {
            let text = match message {
                DapEvent::Client(val) => val,
                DapEvent::Server(val) => val,
            };

            if socket.send(Message::Text(text)).await.is_err() {
                break;
            }

            last_message += 1;
        }

        notify.notified().await;
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
    Ok(Html(include_str!("../../dist/index.html")))
}

async fn start_dap_proxy(
    dap_messages: DapMessages,
    dap_notify: Arc<tokio::sync::Notify>,
) -> Result<(), Box<dyn Error>> {
    let editor_port = 4711;
    let dap_port = 4712;

    let dap_executable = "/Users/thekatze/.vscode/extensions/ms-dotnettools.csharp-2.50.27-darwin-arm64/.debugger/arm64/vsdbg-ui";

    // NOTE: this doesnt work with the csharp vscode extension. check if theres a netcoredbg
    // extension. The server seems to be unable to parse an editor request. Maybe netcoredbg cant
    // handle two JSONs in one request?

    // let dap_executable = "/usr/local/netcoredbg";

    let mut debugger = Command::new(dap_executable)
        .args(["--interpreter=vscode", &format!("--server={dap_port}")])
        .kill_on_drop(true)
        .spawn()?;

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, editor_port)).await?;
    let dap_address = (Ipv4Addr::LOCALHOST, dap_port);

    tracing::info!("DAP Server is running on port {}", dap_port);
    tracing::info!("Listening for DAP messages on port {}", editor_port);

    while let Ok((editor_connection, addr)) = listener.accept().await {
        tracing::info!("New editor connection from {}", addr);

        handle_connection(
            editor_connection,
            dap_address,
            Arc::clone(&dap_messages),
            Arc::clone(&dap_notify),
        )
        .await
        .inspect_err(|err| {
            tracing::error!("Connection closed with error: {}", err);
        })?;

        // when the editor connection closes, clear the message history
        dap_messages.write().await.clear();
    }

    debugger.kill().await?;

    Ok(())
}

#[derive(Clone, Debug)]
enum DapEvent {
    Client(String),
    Server(String),
}

impl std::fmt::Display for DapEvent {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DapEvent::Client(msg) => write!(f, "C: {msg}"),
            DapEvent::Server(msg) => write!(f, "S: {msg}"),
        }
    }
}

async fn handle_connection(
    mut editor_connection: TcpStream,
    dap_address: impl ToSocketAddrs,
    dap_messages: DapMessages,
    dap_notify: Arc<tokio::sync::Notify>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut dap_server = TcpStream::connect(dap_address).await?;

    let (mut editor_recv, mut editor_send) = editor_connection.split();
    let (mut server_recv, mut server_send) = dap_server.split();

    let mut client_buffer = BytesMut::with_capacity(65536);
    let mut server_buffer = BytesMut::with_capacity(65536);

    loop {
        tokio::select! {
            bytes = editor_recv.read_buf(&mut client_buffer) => {
            match bytes {
                Ok(0) => {
                    tracing::warn!("Client connection closed");
                    break;
                }
                Ok(bytes) => {
                    server_send.write_all(&client_buffer[..bytes]).await?;

                    let message = client_buffer.bytes().collect::<Result<Vec<u8>, _>>()?;

                    match std::str::from_utf8(&message) {
                        Ok(msg) => {
                            let (_header, message) = msg.split_once("\r\n").unwrap(); // BUG: sometimes panics here
                            tracing::info!("client: {}", message);
                            dap_messages.write().await.push(DapEvent::Client(message.into()));
                            dap_notify.notify_waiters();
                        },
                        Err(err) => tracing::warn!("Invalid UTF-8: {}", err),
                    };

                    client_buffer.advance(bytes);
                }
                Err(err) => return Err(Box::new(err)),
            }
            },
            bytes = server_recv.read_buf(&mut server_buffer) => {
            match bytes {
                Ok(0) => {
                    tracing::warn!("Server connection closed");
                    break;
                }
                Ok(bytes) => {
                    editor_send.write_all(&server_buffer[..bytes]).await?;
                    let message = server_buffer.bytes().collect::<Result<Vec<u8>, _>>()?;

                    match std::str::from_utf8(&message) {
                        Ok(msg) => {
                            let (_header, message) = msg.split_once("\r\n").unwrap(); // BUG: sometimes panics here
                            tracing::info!("server: {}", message);
                            dap_messages.write().await.push(DapEvent::Server(message.into()));
                            dap_notify.notify_waiters();
                        },
                        Err(err) => tracing::warn!("Invalid UTF-8: {}", err),
                    };

                    server_buffer.advance(bytes);
                }
                Err(err) => return Err(Box::new(err)),
            }
            },
        }
    }

    Ok(())
}
