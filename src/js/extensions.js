RSVP.promiseWhile = function(condition, body) {
  return new RSVP.Promise(function(resolve,reject){
  
    function loop() {
      RSVP.Promise.resolve(condition()).then(function(result){
        // When the result of calling `condition` is no longer true, we are done.
        if (!result){
          resolve();
        } else {
          // When it completes loop again otherwise, if it fails, reject
          RSVP.Promise.resolve(body()).then(loop,reject);
        }
      });
    }

    // Start running the loop
    loop();
  });
};

window.logError = function() {
  console.log('failed');
  throw new Error();
}