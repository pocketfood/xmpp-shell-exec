// Extremely experimental!!
// Please becareful. You should see a lot of errors in your terminal. 
// Has colors in CLI so you can read XML streams with ease
const { client, xml } = require("@xmpp/client");
const { exec } = require("child_process");

const xmpp = client({
  service: "",
  domain: "",
  resource: "shellbot",
  username: "",
  password: "",
});

xmpp.on("online", async (username) => {
  
  // Timestamps when bot goes online
  // This is good to see and log when bot goes online
  const date = new Date();
  console.log('\x1b[1m\x1b[36m','Bot Started on ',date,'\x1b[0m')

  // sends the date to itself
  // put back after done to: username, so it send to itself

  const message = xml(
    "message",
    { type: "chat", to: "" },
    xml("body", {}, 'Bot started on ', date),
  );
  await xmpp.send(message);
});

console.log('\x1b[33m%s\x1b[0m', '--- XMPP Connection ---')
xmpp.start().catch(console.error), () => {
  
};

// This displays all the body messages
xmpp.on("stanza", (stanza) => {
  bodymessage = stanza.getChildText('body')
  console.log('\n','\x1b[1m\x1b[36m','Message:',bodymessage,'\x1b[0m','\n')
});  


xmpp.on("offline", () => {
    console.log("bot offline");
  });

  xmpp.on("stanza", (stanza) => {
    console.log(stanza.toString());
    console.log('\x1b[33m%s\x1b[0m', '--- XML Stream ---');
    
  });

  // Commands start here

  xmpp.on("stanza", (stanza) => {
    
  // reads message and outputs into terminal
  console.log('\x1b[33m%s\x1b[0m', '--- XML Stream From User ---');    
  // The const that makes this all happen
  // The most important CONST
  const text  = stanza.getChildText('body');
  const split = text.split(/(?<=^\S+)\s/)
  const possiblyBash = split[0]
  const command = split[1]
  // full string
  console.log(split, possiblyBash, command)
  console.log(possiblyBash === 'bash')

  if(possiblyBash === 'bash')  {
    exec(command, async (error, stdout, stderr) => {
      if (error) {         
          // Sends the command output to user if command not found
          console.log(`error: ${error.message}`);
          const { to, from } = stanza.attrs;
          stanza.attrs.from = to;
          stanza.attrs.to = from;
          const message = xml(
            "message",
            { type: "chat", to: from },
            xml("body", {}, `${error}`),
            ); 
            xmpp.send(message);  
          return;
      }
      if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
      }
      console.log(`${stdout}`);
  
      // Sends the command output to user
      const { to, from } = stanza.attrs;
      stanza.attrs.from = to;
      stanza.attrs.to = from;
  
      const message = xml(
      "message",
      { type: "chat", to: from },
      xml("body", {}, `${stdout}`) ,
      ); 
      xmpp.send(message);
    });       
  }
  // else just console log the received message
  console.log('\x1b[1m\x1b[32m','--- Heres a command ---','\x1b[0m');  
}); 

xmpp.on("online", (address) => {
  console.log('\x1b[1m\x1b[36m','Online as',address.toString(),'\x1b[0m','\n');
  xmpp.send(xml("presence")).catch(console.error);

});
