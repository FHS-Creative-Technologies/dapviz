use dap_types::types::{EventBody, RequestArguments, ResponseBody};
use enum_dispatch::enum_dispatch;
use std::fmt::Debug;

use crate::dap_states::states::{
    configuration_done::ConfigurationDone, initialized::Initialized, query_threads::QueryThreads,
    uninitialized::Uninitialized, wait_for_breakpoint_hit::WaitForBreakpointHit,
};

use super::dap_state_machine::DapContext;

#[enum_dispatch(DapState)]
pub trait DapStateHandler {
    fn handle_response(
        &mut self,
        context: &DapContext,
        response: &ResponseBody,
    ) -> Option<DapState>;

    fn handle_event(&mut self, _context: &DapContext, _event: &EventBody) -> Option<DapState> {
        None
    }

    fn handle_reverse_request(
        &mut self,
        _context: &DapContext,
        request: &RequestArguments,
    ) -> Option<DapState> {
        match request {
            RequestArguments::runInTerminal(_) => panic!("invalid reverse request - we did not say client was capable of this request (initialize: supportsRunInTerminalRequest)"),
            // RequestArguments::startDebugging(_) => panic!("invalid reverse request - we did not say client was capable of this request (initialize: supportsStartDebuggingRequest)"),
            _ => tracing::error!("Invalid reverse request: {:?}", request),
        }

        None
    }

    fn next_requests(&self, context: &DapContext) -> Option<Box<[RequestArguments]>>;
}

#[enum_dispatch]
#[derive(Debug)]
pub enum DapState {
    Uninitialized,
    Initialized,
    ConfigurationDone,
    WaitForBreakpointHit,
    QueryThreads,
}
