use std::cell::Cell;

use dap_types::types::{ProtocolMessage, ProtocolMessageType, RequestArguments};

use serde::Serialize;

use crate::dap_client::{Language, UserRequest};

use super::{
    dap_state::{DapState, DapStateHandler},
    states::uninitialized::Uninitialized,
};

#[derive(Debug)]
pub struct DapContext {
    pub language: Language,
    pub executable_path: String,
}

#[derive(Debug)]
pub struct DapStateMachine {
    state: DapState,
    context: DapContext,
    might_have_new_requests: Cell<bool>,
}

#[derive(Serialize, Default)]
pub struct ProgramState {}

impl DapStateMachine {
    pub fn new(language: Language, executable_path: String) -> Self {
        DapStateMachine {
            state: Uninitialized.into(),
            context: DapContext {
                language,
                executable_path,
            },
            might_have_new_requests: true.into(),
        }
    }

    pub fn current_program_state(&self) -> Option<ProgramState> {
        None
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
                        .handle_reverse_request(&self.context, request_arguments)
                }
                ProtocolMessageType::Response(response) => {
                    tracing::debug!("Received response: {:?}", response);
                    match &response.result {
                        dap_types::types::ResponseResult::Success { body } => {
                            self.state.handle_response(&self.context, body)
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
                ProtocolMessageType::Event(event_body) => {
                    tracing::debug!("Received event: {:?}", event_body);
                    self.state.handle_event(&self.context, event_body)
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
