use std::cell::Cell;

use dap_types::types::{ProtocolMessage, ProtocolMessageType, RequestArguments};

use serde::Serialize;

use crate::{dap_client::DebugAdapter, user_request::UserRequest};

use super::{
    dap_state::{DapState, DapStateHandler},
    states::uninitialized::Uninitialized,
};

impl From<&dap_types::types::Variable> for VariableInfo {
    fn from(value: &dap_types::types::Variable) -> Self {
        let data = VariableInfoData {
            parent: None,
            reference: value.variables_reference,
            name: value.name.clone(),
            value: value.value.clone(),
            type_: value
                .type_
                .clone()
                .unwrap_or("[[Type not provided]]".into()),
        };

        match value.variables_reference {
            0 => VariableInfo::Queried(data),
            _ => VariableInfo::Unqueried(data),
        }
    }
}

impl VariableInfo {
    pub fn with_parent(self, parent: i64) -> Self {
        match self {
            VariableInfo::Queried(data) => VariableInfo::Queried(VariableInfoData {
                parent: Some(parent),
                ..data
            }),
            VariableInfo::Unqueried(data) => VariableInfo::Unqueried(
                VariableInfoData {
                    parent: Some(parent),
                    ..data
                },
            ),
        }
    }

    pub fn into_queried(self) -> Self {
        match self {
            VariableInfo::Queried(..) => self,
            VariableInfo::Unqueried(data) => VariableInfo::Queried(data),
        }
    }
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct VariableInfoData {
    pub parent: Option<i64>,
    pub reference: i64,
    pub name: String,
    pub value: String,

    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum VariableInfo {
    Queried(VariableInfoData),
    Unqueried(VariableInfoData),
}

impl From<&dap_types::types::Scope> for ScopeInfo {
    fn from(value: &dap_types::types::Scope) -> Self {
        ScopeInfo {
            variables_reference: value.variables_reference,
            variables: None,
        }
    }
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct ScopeInfo {
    #[serde(skip)]
    pub variables_reference: i64,
    pub variables: Option<Vec<VariableInfo>>,
}

impl From<&dap_types::types::StackFrame> for StackFrameInfo {
    fn from(value: &dap_types::types::StackFrame) -> Self {
        StackFrameInfo {
            id: value.id,
            file: value
                .source
                .clone()
                .map(|source| source.path.unwrap_or("[[Source File not provided]]".into()))
                .unwrap_or("[[Source File not provided]]".into()),
            line: value.line,
            function: value.name.clone(),
            scopes: None,
        }
    }
}

#[derive(Serialize, Clone, Debug, Default)]
pub struct StackFrameInfo {
    #[serde(skip)]
    pub id: i64,
    pub file: String,
    pub line: i64,
    pub function: String,
    pub scopes: Option<Vec<ScopeInfo>>,
}

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
    pub debug_adapter: DebugAdapter,
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
    pub fn new(debug_adapter: DebugAdapter, executable_path: String) -> Self {
        DapStateMachine {
            state: Uninitialized.into(),
            context: DapContext {
                debug_adapter,
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
