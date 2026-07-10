export default function ChatBar() {
  return (
    <>
      <div className="chat-bar">
        <div className="attach-btn" title="Attach file">📎</div>
        <div className="attach-btn" title="Upload photo">📷</div>
        <input className="chat-in" placeholder="Ask Cerebro anything about your project — or drag a file or photo here..." />
        <div className="send-btn">➤</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
        Cerebro knows your schedule, contracts, team, RFIs, and documents
      </div>
    </>
  );
}
