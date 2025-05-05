use std::path::Path;
use std::path::PathBuf;
use std::str::FromStr;

use anyhow::Context as _;
use clap::Args;
use clap::Parser as _;
use clap::Subcommand;

use clap::ValueEnum;
use dap_client::DapClient;
use dap_client::DapLaunchInfo;
use dap_states::dap_state_machine::ProgramState;
use debug_adapters::DebugAdapter;
use debug_adapters::DebugAdapterFunctions;
use tracing_subscriber::EnvFilter;
use user_request::UserRequest;
use webserver::Webserver;

pub mod dap_client;
pub mod dap_states;
pub mod debug_adapters;
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

    #[arg(
        long,
        help = "optional path to the dap server, will be automatically derived if debugger was installed through dapviz"
    )]
    debugger_path: Option<String>,

    #[arg(help = "the program to debug")]
    executable_path: String,

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

impl TryFrom<&LaunchInfo> for DapLaunchInfo {
    type Error = anyhow::Error;

    fn try_from(value: &LaunchInfo) -> Result<Self, Self::Error> {
        let full_executable_path = Path::new(&value.executable_path)
            .canonicalize()
            .context("executable path does not exist")?;

        let full_debugger_path = value
            .debugger_path
            .as_ref()
            .map_or_else(|| value.debug_adapter.get_executable_path(), |path| PathBuf::from_str(path).ok())
            .context("debug adapter not found. install the requested debug adapter with 'dapviz install <ADAPTER_NAME>' or pass '--debugger-path <PATH>'")?
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
            debug_adapter: value.debug_adapter.clone(),
        })
    }
}

#[derive(Subcommand)]
enum Command {
    Launch(LaunchInfo),
    Install { debug_adapter: DebugAdapter },
    ListDebugAdapters,
}

#[derive(clap::Parser)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let cli = Cli::parse();

    match cli.command {
        Command::Launch(launch_info) => {
            let (program_state_sender, program_state_receiver) =
                tokio::sync::watch::channel::<ProgramState>(ProgramState::default());

            let (user_request_sender, user_request_receiver) =
                tokio::sync::broadcast::channel::<UserRequest>(64);

            let webserver = Webserver::new(program_state_receiver, user_request_sender);
            let dap_client = DapClient::new(program_state_sender, user_request_receiver);

            let dap_launch_info = (&launch_info).try_into()?;

            tokio::select! {
                ok = dap_client.run(dap_launch_info) => ok,

                // this hosts the visualization and exposes the editor api
                ok = webserver.serve((launch_info.address, launch_info.port)) => ok,
            }
        }
        Command::Install { debug_adapter } => {
            let installation_path = debug_adapter.download().await?;

            tracing::info!(
                "Successfully installed {debug_adapter:?} at {}",
                installation_path.display()
            );

            Ok(())
        }
        Command::ListDebugAdapters => {
            for adapter in DebugAdapter::value_variants() {
                let value = adapter.to_possible_value().unwrap();
                println!("{}", value.get_name());
            }

            Ok(())
        }
    }
}
