const prompt = require('prompt');

const { client, xml, jid } = require("@xmpp/client");
const { exec } = require("child_process");

console.log('[only First part of username]');

// Removes the Prompt and some other options
prompt.start();
prompt.message = '[XMPP LOGIN] ';
prompt.delimiter = '';
prompt.colors = false;
prompt.allowEmpty = false; 

// XMPP LOGIN
// Get two properties from the user: username and password masked
// Only first part of username and password is required

prompt.get([{
    name: 'username',
    message: 'Username:',
    required: true
  },
  {
    name: 'password',
    message: 'Password:',
    hidden: true,
    replace: '*',
    required: true,
    conform: function (value) {
      return true;
    }
}], function (err, result) {
    
 // Only first part of username and password is required

    const xmpp = client({
        service: "wss://localhost:5443/ws",
        domain: "localhost",
        resource: "shellbot",
        username: result.username,
        password: result.password,
});

xmpp.on("online", async (jid) => {
  
  // Timestamps when bot goes online
  // This is good to see and log when bot goes online
  const date = new Date();
  console.log('\x1b[1m\x1b[36m','Bot Started on ',date,'\x1b[0m')

  // sends the date to itself
  // put back after done to: username, so it send to itself

  const message = xml(
    "message",
    { type: "chat", to: jid },
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
      if (bodymessage)
      {
      console.log('\n','\x1b[1m\x1b[36m','Message:',bodymessage,'\x1b[0m','\n')
      }
});  


xmpp.on("offline", () => {
    console.log("bot offline");
  });

  // Displays Presence
  xmpp.on("stanza", (presence) => {
      if (presence)
      {
    console.log(presence.toString());
    console.log('\x1b[33m%s\x1b[0m', '--- PRESENCE ---');
      }
  });

  // Commands start here

  xmpp.on("stanza", (stanza) => {
    
  // reads message and outputs into terminal
  console.log('\x1b[33m%s\x1b[0m', '--- XML Stream From User ---');    
  
  // The const that makes this all happen
  // The most important CONST
  
  const text  = stanza.getChildText('body');
  
  if(text) {
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
      // else just console log the received message
      console.log('\x1b[1m\x1b[32m','--- Heres a command ---','\x1b[0m');    
    } 
  }
}); 

xmpp.on("online", (address) => {
  console.log('\x1b[1m\x1b[36m','Online as',address.toString(),'\x1b[0m','\n');
  xmpp.send(xml("presence")).catch(console.error);

});
});
