use std::sync::{atomic::AtomicU64, Arc};

use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::get, Router};
use clap::Parser as _;
use tokio::net::TcpListener;

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

    let state = AppState {
        count: Arc::new(AtomicU64::new(0)),
    };

    let app = build_app().with_state(state);

    tracing::info!("Server started on {}", listener.local_addr()?);
    axum::serve(listener, app).await?;

    Ok(())
}

#[derive(Clone)]
struct AppState {
    count: Arc<AtomicU64>,
}

fn build_app() -> Router<AppState> {
    Router::new()
        .route("/", get(get_index))
        .nest("/api", build_api())
}

fn build_api() -> Router<AppState> {
    Router::new().route("/count", get(get_count))
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

async fn get_count(State(state): State<AppState>) -> Result<impl IntoResponse, StatusCode> {
    let count = state
        .count
        .fetch_add(1, std::sync::atomic::Ordering::SeqCst);

    Ok(count.to_string())
}
