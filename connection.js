const { client, xml } = require("@xmpp/client");
const debug = require("@xmpp/debug");
//const { send, stdout } = require("process");

const xmpp = client({
  service: "",
  domain: "",
  resource: "",
  username: "",
  password: "",
});

debug(xmpp, true);

xmpp.on("error", (err) => {
  console.error(err);
});

xmpp.on("offline", () => {
  console.log("Memebot offline");
});

xmpp.on("stanza", async (stanza) => {
  if (stanza.is("message")) {
    await xmpp.send(xml("presence", { type: "unavailable" }));
    await xmpp.stop();
  }
});

xmpp.on("online", async (address) => {
  // Makes itself available
  await xmpp.send(xml("presence"));

  // Shows your jid and your resource
  console.log("online as", address.toString());

  // Sends XML
 xmpp.send(xml("presence")).catch(console.error);

  xmpp.on("status", (status) => {
    console.debug(status);
  });

 xmpp.on("chat", function(from, message) {
	console.log('%s says %s', from, message);
});


//variable with command and outputs as message
//var randomNumber = Math.random("");
//var meme = xmpp.send(xml("presence")).catch(console.error);

var matt = "";
var meme = "Last line of message";

// inner scope of exec
// executes shell script code 
const { exec } = require("child_process");

exec("uptime", async (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`SystemOS: ${stdout}`);

  // Sends a regular chat message to user
  // In Xml form
  const message = xml(
    "message",
    { type:"chat", to: matt},
    xml("body",{}, stdout.toString()),

  //xml("body", {}, address.toString()),
  //xml("body", {}, Math.random("")),
  );
  await xmpp.send(message);
});  

//outer scope of exec
const message = xml(
  "message",
  { type:"chat", to: matt},
  xml("body",{}, meme.toString()),

//xml("body", {}, address.toString()),
//xml("body", {}, Math.random("")),
);
await xmpp.send(message);

});



xmpp.start().catch(console.error);
xmpp.on("offline", (address) => {
  console.log("offline", address.toString());
});
