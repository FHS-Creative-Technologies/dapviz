use std::path::Path;

use clap::Args;
use clap::Parser as _;

use dap_client::DapLaunchInfo;
use dap_client::{DapClient, Language};
use dap_states::dap_state_machine::ProgramState;
use dap_types::types::RequestArguments;
use tracing_subscriber::EnvFilter;
use webserver::Webserver;

pub mod dap_client;
pub mod dap_states;
pub mod webserver;

#[derive(Args)]
pub struct LaunchInfo {
    #[arg(help = "the program to debug")]
    executable_path: String,

    // NOTE: i assume we need to know which language we are debugging because different languages
    // place different values in different memory locations
    #[arg(short, long, value_enum, help = "which vendored dap server to start")]
    language: Language,
}

impl From<LaunchInfo> for DapLaunchInfo {
    fn from(value: LaunchInfo) -> Self {
        // TODO: proper error handling
        let full_path = Path::new(&value.executable_path)
            .canonicalize()
            .expect("executable path does not exist");

        DapLaunchInfo {
            executable_path: full_path
                .to_str()
                .expect("executable path should be valid utf-8")
                .into(),
            language: value.language,
        }
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

    let (dap_command_sender, dap_command_receiver) =
        tokio::sync::broadcast::channel::<RequestArguments>(64);

    let webserver = Webserver::new(program_state_receiver, dap_command_sender);
    let dap_client = DapClient::new(program_state_sender, dap_command_receiver);

    tokio::select! {
        ok = dap_client.run(cli.launch_info) => ok,

        // this hosts the visualization and exposes the editor api
        ok = webserver.serve((cli.address, cli.port)) => ok,
    }
}
