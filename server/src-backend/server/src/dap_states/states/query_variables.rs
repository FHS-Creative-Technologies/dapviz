use dap_types::types::{RequestArguments, ResponseBody};

use crate::dap_states::{
    dap_state::{DapState, DapStateHandler},
    dap_state_machine::{DapContext, ProgramState, ScopeInfo, VariableInfo},
};

use super::wait_for_user_input::WaitForUserInput;

#[derive(Debug)]
pub struct QueryVariables;

enum NextRef<'a> {
    Scope(&'a ScopeInfo),
    Variable(i64),
}

enum NextRefMut<'a> {
    Scope(&'a mut ScopeInfo),
    Variable(&'a mut ScopeInfo, usize),
}

impl ProgramState {
    fn next_variable_request(&self) -> Option<NextRef<'_>> {
        self.threads
            .iter()
            .filter_map(|thread| thread.stack_frames.as_ref())
            .flatten()
            .filter_map(|frame| frame.scopes.as_ref())
            .flatten()
            .filter_map(|scope| match scope.variables {
                Some(ref scope_variables) => scope_variables
                    .iter()
                    .filter_map(|variable| match variable {
                        VariableInfo::Queried(..) => None,
                        VariableInfo::Unqueried(reference, _) => Some(NextRef::Variable(*reference)),
                    })
                    .next(),
                None => Some(NextRef::Scope(scope)),
            })
            .next()
    }

    fn next_variable_request_mut(&mut self) -> Option<NextRefMut<'_>> {
        self.threads
            .iter_mut()
            .filter_map(|thread| thread.stack_frames.as_mut())
            .flatten()
            .filter_map(|frame| frame.scopes.as_mut())
            .flatten()
            .filter_map(|scope| match scope.variables.clone() {
                Some(ref scope_variables) => {
                    let variable_index = scope_variables
                        .iter()
                        .enumerate()
                        .filter_map(|(i, variable)| match variable {
                            VariableInfo::Queried(..) => None,
                            VariableInfo::Unqueried(..) => Some(i),
                        })
                        .next();

                    variable_index.map(|i| NextRefMut::Variable(scope, i))
                }
                None => Some(NextRefMut::Scope(scope)),
            })
            .next()
    }
}

impl DapStateHandler for QueryVariables {
    fn next_requests(
        &self,
        context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        let program_state = context
            .program_state
            .as_ref()
            .expect("current state expects initialized program state");

        let next_variables_reference =
            program_state
                .next_variable_request()
                .map(|request| match request {
                    NextRef::Scope(scope) => scope.variables_reference,
                    NextRef::Variable(reference) => reference,
                });

        next_variables_reference.map(|reference| {
            [RequestArguments::variables(
                dap_types::types::VariablesArguments {
                    variables_reference: reference,
                    count: None,
                    filter: None,
                    format: None,
                    start: None,
                },
            )]
            .into()
        })
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

        let ResponseBody::variables(response) = response else {
            tracing::error!("Unexpected response: {:?}", response);
            return None;
        };

        let next_requested = program_state.next_variable_request_mut();

        match next_requested
            .expect("received response even though we have no more variable requests")
        {
            NextRefMut::Scope(scope) => {
                scope.variables = response
                    .variables
                    .iter()
                    .map(VariableInfo::from)
                    .collect::<Vec<_>>()
                    .into()
            }
            NextRefMut::Variable(scope, variable_index) => {
                let variables = scope
                    .variables
                    .as_mut()
                    .expect("next ref must not return variable if scope has no variables");

                // TODO: can we get rid of this clone?
                variables[variable_index] = variables[variable_index].clone().into_queried();

                variables.append(
                    &mut response
                        .variables
                        .iter()
                        .map(|v| VariableInfo::from(v).with_parent(variable_index))
                        .collect::<Vec<_>>(),
                );
            }
        }

        let next_requested = program_state.next_variable_request();

        match next_requested {
            None => Some(WaitForUserInput.into()),
            Some(..) => Some(QueryVariables.into()),
        }
    }
}
