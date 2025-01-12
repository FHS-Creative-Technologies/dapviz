use dap_types::types::{EventBody, RequestArguments, ResponseBody};
use enum_dispatch::enum_dispatch;
use std::fmt::Debug;

use crate::{
    dap_client::UserRequest,
    dap_states::states::{
        configuration_done::ConfigurationDone, initialized::Initialized,
        query_threads::QueryThreads, uninitialized::Uninitialized,
        wait_for_breakpoint_hit::WaitForBreakpointHit,
        wait_for_user_input::WaitForUserInput,
        step::Step,
    },
};

use super::dap_state_machine::DapContext;

#[enum_dispatch(DapState)]
pub trait DapStateHandler {
    fn handle_response(
        &mut self,
        context: &mut DapContext,
        response: &ResponseBody,
    ) -> Option<DapState>;

    fn next_requests(&self, context: &DapContext) -> Option<Box<[RequestArguments]>>;

    fn handle_event(&mut self, _context: &mut DapContext, _event: &EventBody) -> Option<DapState> {
        None
    }

    fn handle_reverse_request(
        &mut self,
        _context: &mut DapContext,
        request: &RequestArguments,
    ) -> Option<DapState> {
        match request {
            RequestArguments::runInTerminal(_) => panic!("invalid reverse request - we did not say client was capable of this request (initialize: supportsRunInTerminalRequest)"),
            // RequestArguments::startDebugging(_) => panic!("invalid reverse request - we did not say client was capable of this request (initialize: supportsStartDebuggingRequest)"),
            _ => tracing::error!("Invalid reverse request: {:?}", request),
        }

        None
    }

    fn handle_user_request(&mut self, _request: &UserRequest) -> Option<DapState> {
        None
    }
}

#[enum_dispatch]
#[derive(Debug)]
pub enum DapState {
    Uninitialized,
    Initialized,
    ConfigurationDone,
    WaitForBreakpointHit,
    QueryThreads,
    WaitForUserInput,
    Step,
}
