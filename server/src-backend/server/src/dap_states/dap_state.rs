use dap_types::types::{EventBody, RequestArguments, ResponseBody};
use std::fmt::Debug;

use super::states::{initialized::InitializedState, uninitialized::UninitializedState};

pub trait DapStateHandler {
    fn handle_response(&mut self, response: &ResponseBody) -> Option<DapState>;
    fn handle_event(&mut self, _event: &EventBody) -> Option<DapState> {
        None
    }

    fn handle_reverse_request(&mut self, request: &RequestArguments) -> Option<DapState> {
        match request {
            RequestArguments::runInTerminal(_) => panic!("invalid reverse request - we did not say client was capable of this request (initialize: supportsRunInTerminalRequest)"),
            // RequestArguments::startDebugging(_) => panic!("invalid reverse request - we did not say client was capable of this request (initialize: supportsStartDebuggingRequest)"),
            _ => tracing::error!("Invalid reverse request: {:?}", request),
        }

        None
    }

    fn next_requests(&self) -> Option<Box<[RequestArguments]>>;
}

#[derive(Debug)]
pub enum DapState {
    Uninitialized(UninitializedState),
    Initialized(InitializedState),
}

impl DapState {
    pub fn handle_response(&mut self, response: &ResponseBody) -> Option<DapState> {
        match self {
            DapState::Uninitialized(uninitialized) => uninitialized.handle_response(response),
            DapState::Initialized(initialized) => initialized.handle_response(response),
        }
    }

    pub fn handle_event(&mut self, event: &EventBody) -> Option<DapState> {
        match self {
            DapState::Uninitialized(uninitialized) => uninitialized.handle_event(event),
            DapState::Initialized(initialized) => initialized.handle_event(event),
        }
    }

    pub fn handle_reverse_request(&mut self, request: &RequestArguments) -> Option<DapState> {
        match self {
            DapState::Uninitialized(uninitialized) => uninitialized.handle_reverse_request(request),
            DapState::Initialized(initialized) => initialized.handle_reverse_request(request),
        }
    }

    pub fn next_requests(&self) -> Option<Box<[RequestArguments]>> {
        match self {
            DapState::Uninitialized(uninitialized) => uninitialized.next_requests(),
            DapState::Initialized(initialized) => initialized.next_requests(),
        }
    }
}
