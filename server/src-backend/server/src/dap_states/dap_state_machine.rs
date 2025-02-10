use std::cell::Cell;

use dap_types::types::{ProtocolMessage, ProtocolMessageType, RequestArguments};

use serde::Serialize;

use crate::{dap_client::Language, user_request::UserRequest};

use super::{
    dap_state::{DapState, DapStateHandler},
    states::uninitialized::Uninitialized,
};

impl From<dap_types::types::StackFrame> for StackFrameInfo {
    fn from(value: dap_types::types::StackFrame) -> Self {
        StackFrameInfo {}
    }
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct StackFrameInfo {}

#[derive(Serialize, Clone, Debug, Default)]
pub struct ThreadInfo {
    pub id: i64,
    pub name: String,
    pub stack_frames: Option<Vec<StackFrameInfo>>,
}

impl ProgramState {
    pub fn from_threads(threads: &[dap_types::types::Thread]) -> Self {
        Self {
            threads: threads
                .iter()
                .map(|thread| ThreadInfo {
                    id: thread.id,
                    name: thread.name.clone(),
                    stack_frames: None,
                })
                .collect(),
        }
    }
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct ProgramState {
    pub threads: Vec<ThreadInfo>,
}

#[derive(Debug)]
pub struct DapContext {
    pub language: Language,
    pub executable_path: String,
    pub program_state: Option<ProgramState>,
}

#[derive(Debug)]
pub struct DapStateMachine {
    state: DapState,
    context: DapContext,
    might_have_new_requests: Cell<bool>,
}

impl DapStateMachine {
    pub fn new(language: Language, executable_path: String) -> Self {
        DapStateMachine {
            state: Uninitialized.into(),
            context: DapContext {
                language,
                executable_path,
                program_state: None,
            },
            might_have_new_requests: true.into(),
        }
    }

    pub fn current_program_state(&self) -> Option<&ProgramState> {
        self.context.program_state.as_ref()
    }

    fn transition(&mut self, state: DapState) {
        tracing::debug!("Transition into '{:?}'", state);
        self.state = state;
        self.might_have_new_requests.set(true);
    }

    pub fn process_dap_messages(mut self, messages: &[ProtocolMessage]) -> Self {
        for message in messages {
            let next_state = match &message.type_ {
                ProtocolMessageType::Request(request_arguments) => {
                    tracing::debug!("Received reverse request: {:?}", request_arguments);
                    self.state
                        .handle_reverse_request(&mut self.context, request_arguments)
                }
                ProtocolMessageType::Response(response) if response.success => {
                    tracing::debug!("Received response: {:?}", response);

                    match &response.result {
                        dap_types::types::ResponseResult::Success { body } => {
                            self.state.handle_response(&mut self.context, body)
                        }
                        dap_types::types::ResponseResult::Error {
                            command,
                            message,
                            show_user: _,
                        } => {
                            tracing::error!("Request \"{command}\" failed: {message}");
                            None
                        }
                    }
                }
                ProtocolMessageType::Response(response) => {
                    tracing::error!("Received error response: {:?}", response);
                    None
                }
                ProtocolMessageType::Event(event_body) => {
                    tracing::debug!("Received event: {:?}", event_body);
                    self.state.handle_event(&mut self.context, event_body)
                }
            };

            if let Some(next_state) = next_state {
                self.transition(next_state);
            }
        }

        self
    }

    pub fn process_user_request(mut self, request: &UserRequest) -> Self {
        if let Some(next_state) = self.state.handle_user_request(request) {
            self.transition(next_state);
        }

        self
    }

    pub fn next_dap_requests(&self) -> Option<Box<[RequestArguments]>> {
        if !self.might_have_new_requests.replace(false) {
            return None;
        }

        self.state.next_requests(&self.context)
    }
}
