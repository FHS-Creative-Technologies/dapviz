use std::fmt::Display;

use crate::types::{EventBody, RequestArguments, ResponseBody};

impl Display for RequestArguments {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RequestArguments::initialize(..) => write!(f, "initialize"),
            RequestArguments::cancel(..) => write!(f, "cancel"),
            RequestArguments::launch(..) => write!(f, "launch"),
            RequestArguments::attach(..) => write!(f, "attach"),
            RequestArguments::restart(..) => write!(f, "restart"),
            RequestArguments::setBreakpoints(..) => write!(f, "setBreakpoints"),
            RequestArguments::setInstructionBreakpoints(..) => {
                write!(f, "setInstructionBreakpoints")
            }
            RequestArguments::setFunctionBreakpoints(..) => write!(f, "setFunctionBreakpoints"),
            RequestArguments::setExceptionBreakpoints(..) => write!(f, "setExceptionBreakpoints"),
            RequestArguments::exceptionInfo(..) => write!(f, "exceptionInfo"),
            RequestArguments::configurationDone(..) => write!(f, "configurationDone"),
            RequestArguments::pause(..) => write!(f, "pause"),
            RequestArguments::continue_(..) => write!(f, "continue"),
            RequestArguments::next(..) => write!(f, "next"),
            RequestArguments::stepInTargets(..) => todo!(),
            RequestArguments::stepIn(..) => write!(f, "stepIn"),
            RequestArguments::stepOut(..) => write!(f, "stepOut"),
            RequestArguments::stepBack(..) => write!(f, "stepBack"),
            RequestArguments::reverseContinue(..) => write!(f, "reverseContinue"),
            RequestArguments::threads(..) => write!(f, "threads"),
            RequestArguments::stackTrace(..) => write!(f, "stackTrace"),
            RequestArguments::scopes(..) => write!(f, "scopes"),
            RequestArguments::source(..) => write!(f, "source"),
            RequestArguments::modules(..) => write!(f, "modules"),
            RequestArguments::variables(..) => write!(f, "variables"),
            RequestArguments::completions(..) => write!(f, "completions"),
            RequestArguments::gotoTargets(..) => write!(f, "gotoTargets"),
            RequestArguments::goto(..) => write!(f, "goto"),
            RequestArguments::restartFrame(..) => write!(f, "restartFrame"),
            RequestArguments::evaluate(..) => write!(f, "evaluate"),
            RequestArguments::setVariable(..) => write!(f, "setVariable"),
            RequestArguments::dataBreakpointInfo(..) => todo!(),
            RequestArguments::setDataBreakpoints(..) => write!(f, "setDataBreakpoints"),
            RequestArguments::disassemble(..) => write!(f, "disassemble"),
            RequestArguments::readMemory(..) => write!(f, "readMemory"),
            RequestArguments::writeMemory(..) => write!(f, "writeMemory"),
            RequestArguments::terminate(..) => write!(f, "terminate"),
            RequestArguments::disconnect(..) => write!(f, "disconnect"),
            RequestArguments::runInTerminal(..) => write!(f, "runInTerminal"),
            RequestArguments::_adapterSettings(..) => write!(f, "_adapterSettings"),
            RequestArguments::_symbols(..) => write!(f, "_symbols"),
            RequestArguments::_excludeCaller(..) => write!(f, "_excludeCaller"),
            RequestArguments::_setExcludedCallers(..) => write!(f, "_setExcludedCallers"),
            RequestArguments::_pythonMessage(..) => write!(f, "_pythonMessage"),
            RequestArguments::unknown => write!(f, "unknown"),
        }
    }
}

impl Display for EventBody {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EventBody::initialized(..) => write!(f, "initialized"),
            EventBody::output(..) => write!(f, "output"),
            EventBody::breakpoint(..) => write!(f, "breakpoint"),
            EventBody::capabilities(..) => write!(f, "capabilities"),
            EventBody::continued(..) => write!(f, "continued"),
            EventBody::exited(..) => write!(f, "exited"),
            EventBody::module(..) => write!(f, "module"),
            EventBody::terminated(..) => write!(f, "terminated"),
            EventBody::thread(..) => write!(f, "thread"),
            EventBody::invalidated(..) => write!(f, "invalidated"),
            EventBody::stopped(..) => write!(f, "stopped"),
            EventBody::_pythonMessage(..) => write!(f, "_pythonMessage"),
        }
    }
}

impl Display for ResponseBody {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResponseBody::initialize(..) => write!(f, "initialize"),
            ResponseBody::cancel => write!(f, "cancel"),
            ResponseBody::launch(..) => write!(f, "launch"),
            ResponseBody::attach => write!(f, "attach"),
            ResponseBody::restart => write!(f, "restart"),
            ResponseBody::setBreakpoints(..) => write!(f, "setBreakpoints"),
            ResponseBody::setInstructionBreakpoints(..) => write!(f, "setInstructionBreakpoints"),
            ResponseBody::setFunctionBreakpoints(..) => todo!(),
            ResponseBody::setExceptionBreakpoints => write!(f, "setExceptionBreakpoints"),
            ResponseBody::exceptionInfo(..) => write!(f, "exceptionInfo"),
            ResponseBody::configurationDone(..) => todo!(),
            ResponseBody::pause => write!(f, "pause"),
            ResponseBody::continue_(..) => write!(f, "continue_"),
            ResponseBody::next(..) => todo!(),
            ResponseBody::stepInTargets(..) => write!(f, "stepInTargets"),
            ResponseBody::stepIn(..) => write!(f, "stepIn"),
            ResponseBody::stepOut(..) => write!(f, "stepOut"),
            ResponseBody::stepBack => write!(f, "stepBack"),
            ResponseBody::reverseContinue => write!(f, "reverseContinue"),
            ResponseBody::threads(..) => write!(f, "threads"),
            ResponseBody::stackTrace(..) => write!(f, "stackTrace"),
            ResponseBody::scopes(..) => write!(f, "scopes"),
            ResponseBody::source(..) => write!(f, "source"),
            ResponseBody::modules(..) => write!(f, "modules"),
            ResponseBody::variables(..) => write!(f, "variables"),
            ResponseBody::completions(..) => todo!(),
            ResponseBody::gotoTargets(..) => write!(f, "gotoTargets"),
            ResponseBody::goto => write!(f, "goto"),
            ResponseBody::restartFrame => write!(f, "restartFrame"),
            ResponseBody::evaluate(..) => write!(f, "evaluate"),
            ResponseBody::setVariable(..) => write!(f, "setVariable"),
            ResponseBody::dataBreakpointInfo(..) => todo!(),
            ResponseBody::setDataBreakpoints(..) => write!(f, "setDataBreakpoints"),
            ResponseBody::disassemble(..) => todo!(),
            ResponseBody::readMemory(..) => write!(f, "readMemory"),
            ResponseBody::writeMemory(..) => write!(f, "writeMemory"),
            ResponseBody::terminate => write!(f, "terminate"),
            ResponseBody::disconnect => write!(f, "disconnect"),
            ResponseBody::runInTerminal(..) => write!(f, "runInTerminal"),
            ResponseBody::_adapterSettings => write!(f, "_adapterSettings"),
            ResponseBody::_symbols(..) => write!(f, "_symbols"),
            ResponseBody::_excludeCaller(..) => write!(f, "_excludeCaller"),
            ResponseBody::_setExcludedCallers => write!(f, "_setExcludedCallers"),
            ResponseBody::_pythonMessage => write!(f, "_pythonMessage"),
        }
    }
}
