use dap_types::{
    types::{RequestArguments, SetFunctionBreakpointsArguments},
    FunctionBreakpoint,
};

use crate::{
    dap_client::Language,
    dap_states::{
        dap_state::{DapState, DapStateHandler},
        dap_state_machine::DapContext,
    },
};

use super::configuration_done::ConfigurationDone;

#[derive(Debug)]
pub struct ProgramLaunched;

impl DapStateHandler for ProgramLaunched {
    fn next_requests(
        &self,
        context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        let main_fn_name = match context.language {
            Language::CSharp => "main",
        };

        Some(Box::new([RequestArguments::setFunctionBreakpoints(
            SetFunctionBreakpointsArguments {
                breakpoints: vec![FunctionBreakpoint {
                    condition: None,
                    hit_condition: None,
                    name: main_fn_name.into(),
                }],
            },
        )]))
    }

    fn handle_response(
        &mut self,
        _context: &DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        match response {
            dap_types::types::ResponseBody::setFunctionBreakpoints(..) => {
                Some(ConfigurationDone.into())
            }
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
