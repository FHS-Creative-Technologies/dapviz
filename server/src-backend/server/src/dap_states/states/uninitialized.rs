use dap_types::types::RequestArguments;

use crate::{
    dap_client::Language,
    dap_states::{
        dap_state::{DapState, DapStateHandler},
        dap_state_machine::DapContext,
    },
};

use super::initialized::Initialized;

#[derive(Debug)]
pub struct Uninitialized;

impl DapStateHandler for Uninitialized {
    fn next_requests(
        &self,
        context: &DapContext,
    ) -> Option<Box<[dap_types::types::RequestArguments]>> {
        Some(Box::new([RequestArguments::initialize(
            dap_types::types::InitializeRequestArguments {
                adapter_id: match context.language {
                    Language::CSharp => "coreclr".into(),
                },
                client_id: Some("dapviz".into()),
                client_name: Some("dapviz".into()),
                columns_start_at_1: true.into(),
                lines_start_at_1: true.into(),
                locale: Some("en-us".into()),
                path_format: Some("path".into()),
                supports_ansi_styling: None,
                supports_args_can_be_interpreted_by_shell: None,
                supports_invalidated_event: None,
                supports_memory_event: true.into(),
                supports_memory_references: true.into(),
                supports_progress_reporting: None,
                supports_run_in_terminal_request: false.into(),
                supports_start_debugging_request: false.into(),
                supports_variable_paging: false.into(),
                supports_variable_type: true.into(),
            },
        )]))
    }

    fn handle_response(
        &mut self,
        _context: &DapContext,
        response: &dap_types::types::ResponseBody,
    ) -> Option<DapState> {
        match response {
            dap_types::types::ResponseBody::initialize(..) => Some(Initialized.into()),
            _ => {
                tracing::error!("Unexpected response: {:?}", response);
                None
            }
        }
    }
}
