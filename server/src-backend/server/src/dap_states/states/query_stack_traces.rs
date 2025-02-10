use dap_types::types::{RequestArguments, ResponseBody};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::{DapContext, StackFrameInfo},
};

use super::query_scopes::QueryScopes;

#[derive(Debug)]
pub struct QueryStackTraces;

impl DapStateHandler for QueryStackTraces {
    fn next_requests(
        &self,
        context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        let program_state = context
            .program_state
            .as_ref()
            .expect("current state expects initialized program state");

        if program_state.threads.is_empty() {
            tracing::warn!("QueryStackTraces state entered without threads in ProgramState")
        }

        // TODO:
        // 1) stackTrace request for threads -> we get a stackFrame per thread back
        // 2) scopes request for stackFrame -> we get a scope with variablesReference back
        // 3) variables request for scope -> we get variables yay

        let next_stack_trace_request = program_state
            .threads
            .iter()
            .filter_map(|thread| {
                thread
                    .stack_frames
                    .is_none()
                    .then_some(RequestArguments::stackTrace(
                        dap_types::types::StackTraceArguments {
                            thread_id: thread.id,
                            format: None,
                            levels: None,
                            start_frame: None,
                        },
                    ))
            })
            .next();

        next_stack_trace_request.map(|request| [request].into())
    }

    fn handle_response(
        &mut self,
        context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        let program_state = context
            .program_state
            .as_mut()
            .expect("current state expects initialized program state");

        let thread_count = program_state.threads.len();

        match response {
            ResponseBody::stackTrace(stack_trace) => Some(
                program_state
                    .threads
                    .iter_mut()
                    .enumerate()
                    .find(|(_, thread)| thread.stack_frames.is_none())
                    .map_or(QueryScopes.into(), |(i, thread)| {
                        thread.stack_frames = Some(
                            stack_trace
                                .stack_frames
                                .iter()
                                .cloned()
                                .map(StackFrameInfo::from)
                                .collect(),
                        );

                        if i == thread_count - 1 {
                            // if we just filled the last thread, continue with querying scopes
                            QueryScopes.into()
                        } else {
                            // else continue with the next thread
                            QueryStackTraces.into()
                        }
                    }),
            ),
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
