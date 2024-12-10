use std::cell::Cell;

use dap_types::types::{ProtocolMessage, ProtocolMessageType, RequestArguments};

use serde::Serialize;

use crate::dap_client::Language;

use super::{
    dap_state::{DapState, DapStateHandler},
    states::uninitialized::Uninitialized,
};

#[derive(Debug)]
pub struct DapStateMachine {
    state: DapState,
    might_have_new_requests: Cell<bool>,
}

#[derive(Serialize, Default)]
pub struct ProgramState {}

impl DapStateMachine {
    pub fn new(language: Language) -> Self {
        DapStateMachine {
            state: Uninitialized(language).into(),
            might_have_new_requests: true.into(),
        }
    }

    pub fn current_program_state(&self) -> ProgramState {
        ProgramState {}
    }

    pub fn process(mut self, messages: &[ProtocolMessage]) -> Self {
        for message in messages {
            let next_state = match &message.type_ {
                ProtocolMessageType::Request(request_arguments) => {
                    self.state.handle_reverse_request(request_arguments)
                }
                ProtocolMessageType::Response(response) => match &response.result {
                    dap_types::types::ResponseResult::Success { body } => {
                        self.state.handle_response(body)
                    }
                    dap_types::types::ResponseResult::Error {
                        command,
                        message,
                        show_user: _,
                    } => {
                        tracing::error!("DAP Request \"{command}\" failed: {message}");
                        None
                    }
                },
                ProtocolMessageType::Event(event_body) => self.state.handle_event(event_body),
            };

            if let Some(next) = next_state {
                self.state = next;
                self.might_have_new_requests.set(true);
            }
        }
        self
    }

    pub fn next_dap_requests(&self) -> Option<Box<[RequestArguments]>> {
        if !self.might_have_new_requests.replace(false) {
            return None;
        }

        self.state.next_requests()
    }
}
