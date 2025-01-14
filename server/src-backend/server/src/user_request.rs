use axum::extract::ws::Message;
use serde::Serialize;

#[derive(Serialize, Debug, Copy, Clone, PartialEq, Eq)]
pub enum UserRequest {
    Step(i64),
    StepIn(i64),
    StepOut(i64),
}

impl TryFrom<Message> for UserRequest {
    type Error = anyhow::Error;

    fn try_from(value: Message) -> Result<Self, Self::Error> {
        let request_bytes = match value {
            Message::Binary(bytes) => bytes,
            _ => anyhow::bail!("expected binary websocket message"),
        };

        anyhow::ensure!(request_bytes.len() == 9, "Unexpected message length");

        let thread_id = i64::from_le_bytes(request_bytes[0..8].try_into()?);
        let request_id = request_bytes[8];

        Ok(match request_id {
            1 => UserRequest::Step(thread_id),
            2 => UserRequest::StepIn(thread_id),
            3 => UserRequest::StepOut(thread_id),
            _ => anyhow::bail!("unknown user request id: {}", request_id),
        })
    }
}
