const catIds = {
    1: "Oval",
    2: "Road",
    3: "Dirt Oval",
    4: "Dirt Road"
};

const IRATING_RE = /"iRating":(\d+).*?"catId":(\d)/g;
const ID_RE = /profile\/(\d+).page/;

let saved = 0;
let requested = 0;

async function get_irating(cust_id, tries) {
    let resp = await fetch(`https://members.iracing.com/membersite/member/CareerStats.do?custid=${cust_id}`);
    if (resp.status != 200) {
        console.error(`Rate limited! Id: ${cust_id} Tries: ${tries}`);
        await limiter(500 * tries + 1);
        return await get_irating(cust_id, tries + 1);
    }
    let page = await resp.text();
    irating = {};
    for (match of page.matchAll(IRATING_RE)) {
        let name = catIds[match[2]];
        irating[name] = match[1];
    }
    return irating;
}

async function memo_irating(cust_id) {
    let response = await browser.runtime.sendMessage({
        type: "get",
        id: cust_id
    });

    if (!response.present) {
        await limiter(250);
        let irating = await get_irating(cust_id, 0);
        await browser.runtime.sendMessage({
            type: "set",
            id: cust_id,
            irating: irating
        });
        requested += 1;
        return irating;
    } else {
        saved += 1;
        return response.irating;
    }
}

async function add_ir(id, link) {
    let name = link.innerText;
    let irating = await memo_irating(id);
    link.innerText = `${name} [${irating["Road"]}]`;
}

async function consume(id, links) {
    for (link of links) {
        await add_ir(id, link);
    }
}

function limiter(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    let drivers = new Map();
    let posts = document.querySelectorAll(".tdPostAuthor");

    for (post of posts) {
        let link = post.getElementsByTagName("a")[0];
        let id = link.href.match(ID_RE)[1];
        if (drivers.has(id)) {
            let links = drivers.get(id);
            drivers.set(id, links.concat([link]))
        } else {
            drivers.set(id, [link])
        }
    }

    let futures = [];
    for (let [id, links] of drivers.entries()) {
        futures.push(consume(id, links));
    }

    await Promise.all(futures);

    console.log(`Saved: ${saved}, Requested: ${requested}, Total: ${saved + requested}`);
})()