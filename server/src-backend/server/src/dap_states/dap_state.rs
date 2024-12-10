use dap_types::types::{EventBody, RequestArguments, ResponseBody};
use enum_dispatch::enum_dispatch;
use std::fmt::Debug;

use crate::dap_states::states::{
    configuration_done::ConfigurationDone, initialized::Initialized, uninitialized::Uninitialized,
};

#[enum_dispatch(DapState)]
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

#[enum_dispatch]
#[derive(Debug)]
pub enum DapState {
    Uninitialized,
    Initialized,
    ConfigurationDone,
}
