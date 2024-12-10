use dap_types::{
    types::{RequestArguments, SetFunctionBreakpointsArguments},
    FunctionBreakpoint,
};

use crate::{
    dap_client::Language,
    dap_states::dap_state::{DapState, DapStateHandler},
};

use super::configuration_done::ConfigurationDone;

#[derive(Debug)]
pub struct Initialized(pub Language);

impl DapStateHandler for Initialized {
    fn next_requests(&self) -> Option<Box<[dap_types::types::RequestArguments]>> {
        let main_fn_name = match self.0 {
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

    fn handle_response(&mut self, response: &dap_types::types::ResponseBody) -> Option<DapState> {
        match response {
            dap_types::types::ResponseBody::setFunctionBreakpoints(..) => {
                Some(ConfigurationDone().into())
            }
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
