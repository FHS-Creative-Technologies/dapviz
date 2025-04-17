use std::{io::Read, net::Ipv4Addr, sync::atomic::AtomicUsize, time::Duration};

use anyhow::Context;
use backoff::{ExponentialBackoffBuilder, future::retry};
use bytes::{Bytes, BytesMut};
use dap_types::types::{ProtocolMessage, RequestArguments};
use serde::Serialize;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{
        TcpStream,
        tcp::{OwnedReadHalf, OwnedWriteHalf},
    },
};

use crate::{
    dap_states::dap_state_machine::{DapStateMachine, ProgramState},
    user_request::UserRequest,
};

use clap::ValueEnum;
#[derive(Serialize, Debug, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum DebugAdapter {
    #[value(name = "netcoredbg")]
    NetCoreDbg,
}

pub struct DapLaunchInfo {
    pub executable_path: String,
    pub debugger_path: String,
    pub debug_adapter: DebugAdapter,
}

pub struct DapClient {
    program_state_sender: tokio::sync::watch::Sender<ProgramState>,
    user_request_receiver: tokio::sync::broadcast::Receiver<UserRequest>,
}

struct DapProcess {
    // not directly used, but will kill the child process on drop
    _process: tokio::process::Child,
    tcp_read: tokio::sync::Mutex<OwnedReadHalf>,
    tcp_write: tokio::sync::Mutex<OwnedWriteHalf>,

    sequence_id: AtomicUsize,
}

impl DapProcess {
    async fn start(launch_info: &DapLaunchInfo) -> anyhow::Result<Self> {
        const PORT: u16 = 4711;

        let mut command = match launch_info.debug_adapter {
            DebugAdapter::NetCoreDbg => {
                let mut command = tokio::process::Command::new(&launch_info.debugger_path);
                command.args(["--interpreter=vscode", &format!("--server={PORT}")]);

                command
            }
        };

        command.kill_on_drop(true);

        let child = command.spawn()?;

        // give the process some initial time to spawn
        tokio::time::sleep(Duration::from_millis(25)).await;

        const RETRY_INTERVAL_MS: u64 = 125;
        const RETRY_MULTIPLIER: u64 = 2;
        const RETRY_COUNT: u32 = 5;

        let (read, write) = retry(
            ExponentialBackoffBuilder::default()
                .with_initial_interval(Duration::from_millis(RETRY_INTERVAL_MS))
                .with_multiplier(RETRY_MULTIPLIER as f64)
                .with_randomization_factor(0.0)
                .with_max_elapsed_time(Some(Duration::from_millis(
                    RETRY_INTERVAL_MS * RETRY_MULTIPLIER.pow(RETRY_COUNT - 1),
                )))
                .build(),
            || async {
                if child.id().is_none() {
                    return Err(backoff::Error::Permanent(anyhow::anyhow!(
                        "dap server did not successfully start"
                    )));
                }

                let split = TcpStream::connect((Ipv4Addr::LOCALHOST, PORT))
                    .await
                    .context("tcp connection to dap server could not be initialized")
                    .map_err(backoff::Error::transient)?
                    .into_split();

                Ok(split)
            },
        )
        .await?;

        let process = DapProcess {
            _process: child,
            tcp_read: read.into(),
            tcp_write: write.into(),
            sequence_id: 1.into(),
        };

        Ok(process)
    }

    async fn send(&self, requests: &[RequestArguments]) -> anyhow::Result<()> {
        // TODO: i have no idea which ordering i should use here
        let first_request_id = self
            .sequence_id
            .fetch_add(requests.len(), std::sync::atomic::Ordering::SeqCst);

        let messages = requests
            .iter()
            .cloned()
            .enumerate()
            .flat_map(move |(i, request)| {
                let message = ProtocolMessage {
                    seq: first_request_id + i,
                    type_: dap_types::types::ProtocolMessageType::Request(request),
                };

                let payload = serde_json::to_string(&message)
                    .expect("dap request should not contain map with non-string key");
                let length = payload.len();

                format!("Content-Length: {}\r\n\r\n{}", length, payload).into_bytes()
            });

        let bytes = Bytes::from_iter(messages);

        let mut tcp_write = self.tcp_write.lock().await;
        tcp_write.write_all(&bytes).await?;

        Ok(())
    }

    async fn receive(&self) -> anyhow::Result<Vec<ProtocolMessage>> {
        let mut read_buffer = BytesMut::with_capacity(1024 * 64);

        let bytes = {
            self.tcp_read
                .lock()
                .await
                .read_buf(&mut read_buffer)
                .await?
        };

        if bytes == 0 {
            anyhow::bail!("DAP Connection was closed")
        }

        let message = read_buffer.bytes().collect::<Result<Vec<u8>, _>>()?;
        let message = std::str::from_utf8(&message)?.to_owned();

        Ok(message
            .split("Content-Length: ")
            .skip(1)
            .filter_map(|body| {
                let first_index = body.find("{")?;
                let json = &body[first_index..];

                serde_json::from_str(json)
                    .inspect_err(|err| {
                        tracing::error!("Failed parsing DAP response: {}\n{}", json, err)
                    })
                    .ok()
            })
            .collect::<Vec<_>>())
    }
}

impl DapClient {
    pub fn new(
        program_state_sender: tokio::sync::watch::Sender<ProgramState>,
        user_request_receiver: tokio::sync::broadcast::Receiver<UserRequest>,
    ) -> Self {
        DapClient {
            program_state_sender,
            user_request_receiver,
        }
    }

    pub async fn run(mut self, launch_info: DapLaunchInfo) -> anyhow::Result<()> {
        let process = DapProcess::start(&launch_info).await?;

        let mut state_machine =
            DapStateMachine::new(launch_info.debug_adapter, launch_info.executable_path);

        while !state_machine.program_terminated() {
            while let Some(next) = state_machine.next_dap_requests() {
                process.send(&next).await?;
                state_machine = state_machine.process_dap_messages(&process.receive().await?);
            }

            if let Some(program_state) = state_machine.current_program_state() {
                if self
                    .program_state_sender
                    .send(program_state.clone())
                    .is_err()
                {
                    break;
                }
            }

            tokio::select! {
                request = self.user_request_receiver.recv() => {
                    let request = request.context("no more dap command senders")?;

                    // TODO: add user requests to a queue so inputs don't get discarded if the
                    // current state can't handle it
                    state_machine = state_machine.process_user_request(&request);
                },
                messages = process.receive() => {
                    let messages = messages.context("could not receive messages")?;
                    if !messages.is_empty() {
                        state_machine = state_machine.process_dap_messages(&messages);
                    }
                }
            };
        }

        // TODO: let the websocket listeners know
        tracing::info!("Debuggee terminated, exiting.");

        Ok(())
    }
}
