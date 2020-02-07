let memo = new Map();

async function handle_message(msg) {
    if (msg.type === "get") {
        if (memo.has(msg.id)) {
            return { present: true, irating: memo.get(msg.id) };
        } else {
            return { present: false };
        }
    }
    else if (msg.type === "set") {
        memo.set(msg.id, msg.irating)
        return { set: true }
    }
}

(async () => {
    browser.runtime.onMessage.addListener(handle_message);
})()
