use std::{error::Error, io::Read as _, net::Ipv4Addr, sync::Arc, time::Duration};

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

    let (tx, rx) = tokio::sync::mpsc::channel::<()>(1024);

    tracing_subscriber::fmt().init();

    let listener = TcpListener::bind((args.address, args.port)).await?;

    let state = AppState {
        dap_receiver: Arc::new(rx),
    };

    let app = build_app().with_state(state);

    tracing::info!("Server started on {}", listener.local_addr()?);

    // do these things concurrently
    tokio::spawn(async move { start_dap_proxy(tx).await.expect("dap proxy failed :(") });
    axum::serve(listener, app).await?;

    Ok(())
}

#[derive(Clone)]
struct AppState {
    dap_receiver: Arc<tokio::sync::mpsc::Receiver<()>>,
}

fn build_app() -> Router<AppState> {
    Router::new()
        .route("/", get(get_index))
        .nest("/api", build_api())
}

fn build_api() -> Router<AppState> {
    Router::new().route("events", get(initialize_events_websocket))
}

async fn initialize_events_websocket(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state.dap_receiver))
}

async fn handle_socket(mut socket: WebSocket, _rx: Arc<tokio::sync::mpsc::Receiver<()>>) {
    while socket.send(Message::Text("Hello!".into())).await.is_ok() {
        tokio::time::sleep(Duration::from_secs(1)).await;
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

async fn start_dap_proxy(tx: tokio::sync::mpsc::Sender<()>) -> Result<(), Box<dyn Error>> {
    let editor_port = 4711;
    let dap_port = 4712;

    // TODO: actually start dap server
    //
    // let vsdbg_executable = "/Users/thekatze/.vscode/extensions/ms-dotnettools.csharp-2.50.27-darwin-arm64/.debugger/arm64/vsdbg-ui";
    // let mut debugger = Command::new(vsdbg_executable)
    //     .args(&[format!("--server={dap_port}")])
    //     .kill_on_drop(true)
    //     .spawn()?;
    //
    // debugger.kill().await?;

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, editor_port)).await?;
    let dap_address = (Ipv4Addr::LOCALHOST, dap_port);

    tracing::info!("DAP Server is running on port {}", dap_port);
    tracing::info!("Listening for DAP messages on port {}", editor_port);

    while let Ok((connection, addr)) = listener.accept().await {
        tracing::info!("New connection from {}", addr);

        let tx = tx.clone();
        tokio::spawn(async move {
            match handle_connection(connection, dap_address, tx).await {
                Ok(_) => (),
                Err(err) => {
                    tracing::info!("Connection closed: {}", err);
                }
            }
        });
    }

    Ok(())
}

/*

#[derive(Debug)]
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

*/

async fn handle_connection(
    mut connection: TcpStream,
    dap_address: impl ToSocketAddrs,
    tx: tokio::sync::mpsc::Sender<()>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut dap_server = TcpStream::connect(dap_address).await?;

    let (mut client_recv, mut client_send) = connection.split();
    let (mut server_recv, mut server_send) = dap_server.split();

    let mut client_buffer = BytesMut::with_capacity(65536);
    let mut server_buffer = BytesMut::with_capacity(65536);

    loop {
        tokio::select! {
            bytes = client_recv.read_buf(&mut client_buffer) => {
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
                            let (_header, _message) = msg.split_once("\r\n").unwrap();
                            tx.send(()).await?;
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
                    client_send.write_all(&server_buffer[..bytes]).await?;
                    let message = server_buffer.bytes().collect::<Result<Vec<u8>, _>>()?;

                    match std::str::from_utf8(&message) {
                        Ok(msg) => {
                            let (_header, _json) = msg.split_once("\r\n").unwrap();
                            tx.send(()).await?;
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
