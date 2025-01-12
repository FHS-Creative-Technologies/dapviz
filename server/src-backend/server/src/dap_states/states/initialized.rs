use dap_types::types::RequestArguments;
use serde_json::{Map, Value};

use crate::{
    dap_client::Language,
    dap_states::{
        dap_state::{DapState, DapStateHandler},
        dap_state_machine::DapContext,
    },
};

use super::configuration_done::ConfigurationDone;

#[derive(Debug)]
pub struct Initialized;

impl DapStateHandler for Initialized {
    fn next_requests(
        &self,
        context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        let arguments = Map::from_iter(match context.language {
            Language::CSharp => [
                // arguments taken from
                // https://github.com/Samsung/netcoredbg/blob/83214c3993c052a0ccb8854b913e028c5e365bc6/src/protocols/vscodeprotocol.cpp#L585
                ("cwd".to_owned(), "".into()),
                ("env".to_owned(), Value::Object(Map::from_iter([]))),
                ("justMyCode".to_owned(), true.into()),
                ("enableStepFiltering".to_owned(), true.into()),
                ("stopAtEntry".to_owned(), true.into()),
                ("program".to_owned(), context.executable_path.clone().into()),
                ("args".to_owned(), Value::Array(vec![])),
            ],
        });

        Some(Box::new([RequestArguments::launch(
            dap_types::types::Either::Second(serde_json::Value::Object(arguments)),
        )]))
    }

    fn handle_response(
        &mut self,
        _context: &mut DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        match response {
            dap_types::types::ResponseBody::launch(..) => Some(ConfigurationDone.into()),
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
