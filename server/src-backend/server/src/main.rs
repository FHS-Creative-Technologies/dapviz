use std::path::Path;

use anyhow::Context as _;
use clap::Args;
use clap::Parser as _;

use dap_client::DapLaunchInfo;
use dap_client::{DapClient, DebugAdapter};
use dap_states::dap_state_machine::ProgramState;
use tracing_subscriber::EnvFilter;
use user_request::UserRequest;
use webserver::Webserver;

pub mod dap_client;
pub mod dap_states;
pub mod user_request;
pub mod webserver;

#[derive(Args)]
pub struct LaunchInfo {
    #[arg(
        short,
        long,
        value_enum,
        help = "which debug adapter is at the debugger_path"
    )]
    debug_adapter: DebugAdapter,

    #[arg(help = "path to the dap server")]
    debugger_path: String,

    #[arg(help = "the program to debug")]
    executable_path: String,
}

impl TryFrom<LaunchInfo> for DapLaunchInfo {
    type Error = anyhow::Error;

    fn try_from(value: LaunchInfo) -> Result<Self, Self::Error> {
        let full_executable_path = Path::new(&value.executable_path)
            .canonicalize()
            .context("executable path does not exist")?;

        let full_debugger_path = Path::new(&value.debugger_path)
            .canonicalize()
            .context("debugger path does not exist")?;

        Ok(DapLaunchInfo {
            executable_path: full_executable_path
                .to_str()
                .context("executable path should be valid utf-8")?
                .into(),
            debugger_path: full_debugger_path
                .to_str()
                .context("debugger path should be valid utf-8")?
                .into(),
            debug_adapter: value.debug_adapter,
        })
    }
}

#[derive(clap::Parser)]
struct Cli {
    #[command(flatten)]
    launch_info: LaunchInfo,

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
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let (program_state_sender, program_state_receiver) =
        tokio::sync::watch::channel::<ProgramState>(ProgramState::default());

    let (user_request_sender, user_request_receiver) =
        tokio::sync::broadcast::channel::<UserRequest>(64);

    let webserver = Webserver::new(program_state_receiver, user_request_sender);
    let dap_client = DapClient::new(program_state_sender, user_request_receiver);

    let launch_info = cli.launch_info.try_into()?;

    tokio::select! {
        ok = dap_client.run(launch_info) => ok,

        // this hosts the visualization and exposes the editor api
        ok = webserver.serve((cli.address, cli.port)) => ok,
    }
}
