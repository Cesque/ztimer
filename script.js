// ztimer by @cesque //

// different puzzle generators
var generators = {
  '2x2': new Scrambo().type('222'),
  '3x3': new Scrambo().type('333'),
  '4x4': new Scrambo().type('444'),
  '5x5': new Scrambo().type('555'),

  'pyraminx': new Scrambo().type('pyram'),
};

// default settings, in case the cookie is not set
var defaultsettings = {
  colorise: true,
  darkmode: true,
  inspection: true,
  hidetimer: false,
  timerprecision: 3,
};

// holds the current settings
var settings;

// a list of every solve so far
var solves = [];
// the id of the current solve
var solveid = 0;

// the clicked solve for which to display info in the solve info panel
var targetsolve = null;

// how long inspection time should be
var inspectiontime = 15;

// which generator is selected (from `generators`)
var currentgenerator = '3x3'
// the current scramble as a string
var scramble = '';

// the current timer / inspection timer (not rounded)
var timer = 0.0;
// the amount of seconds in penalty time to add
var penalty = 0;
// timer state: stopped, started, inspection, dnf
var timerState = 'stopped';

// if true, prevent the timer from counting another tick when stopped
var skipnextupdate = false;
// if true, user can't start another solve; prevents accidental double hits after a solve
var cantstartyet = false;

// the time which this current solve started at
var start = new Date().getTime();

/* --------------------------- TIMER FUNCTIONS --------------------------- */

// reset the timer back to 0
function resetTimer() {
  timerState = 'stopped'
  timer = 0;
  $('#timer').text(timer.toFixed(settings.timerprecision)).removeClass();
}

// start the timer
function startTimer() {
  skipnextupdate = false;
  start = new Date().getTime();
  timerState = 'started';
  updateTimer();
}

// called every 10ms while the timer is running
function updateTimer() {
  //so that this function isn't erroneously called an extra time after stopInspection()
  if (skipnextupdate) {
    return;
  }
  // get time in ms since the timer started
  var time = new Date().getTime() - start;
  timer = time / 1000;
  
  // se tthe timer text to the appropriate value depending on user settings
  if (settings.hidetimer) {
    $('#timer').text('solving');
  } else {
    $('#timer').text(timer.toFixed(settings.timerprecision));
  }
  
  // if the timer is still running...
  if (timerState == 'started') {
    // ... call this function again in 10ms (which incidentally limits the timer precision to max 3 d.p.)
    setTimeout(function () {
      updateTimer();
    }, 10);
  }
}

// stop the timer and add the solve to the list
function stopTimer() {
  skipnextupdate = true;
  timerState = 'stopped';
  $('#timer').text(timer.toFixed(settings.timerprecision));
  // add solve to the `solves` array (this functionr returns the solve for us to do more stuff with)
  var s = addSolve(timer);
  // ...like adding it to the list of solves on the page
  addSolveToPage(s);
  // updates all averages
  updateAverages();
  updateSolvesCount();
  
  // get next solve!
  penalty = 0;
  getScramble();
}

/* --------------------------- INSPECTION FUNCTIONS --------------------------- */

// start inspection time
function startInspection() {
  skipnextupdate = false;
  $('#timer').addClass('timer-inspection');
  start = new Date().getTime();
  timer = inspectiontime;
  timerState = 'inspection';
  updateInspection();
}



// called every 10ms while inspection is happening
function updateInspection() {
  // so that this function isn't erroneously called an extra time after stopInspection()
  if (skipnextupdate) {
    return;
  }
  // TODO: fix timer 0.5s bug.
  // see below: for some reason the timer was cutting off the first 0.5s
  // this is 'fixed' by a hack below but now the '0' is 0.5 seconds too long
  // which may lead to early undeserved penalties
  var time = new Date().getTime() - start;
  var timer2 = time / 1000;
  //for some reason the timer was cutting off the first 0.5s
  timer = (inspectiontime + 0.5) - timer2;
  
  //display and set the correct penalty if the user is over time
  if (timer > 0) {
    //within inspection time
    $('#timer').text(timer.toFixed(0));
    penalty = 0;
  } else if (timer <= 0 && timer > -2) {
    // +2 penalty
    $('#timer').text('+2 penalty');
    penalty = +2;
  } else if (timer <= -2 && timer > -4) {
    // +4 penalty
    $('#timer').text('+4 penalty');
    penalty = +4;
  } else if (timer <= -4) {
    // did not finish
    $('#timer').text('DNF');
    // end timer
    timerState = 'dnf';
  }

  // call this function again in 10ms
  setTimeout(function () {
    if (timerState == 'inspection') {
      updateInspection();
    }
  }, 10);
}

// stop the inspection time and start the timer
function stopInspection() {
  skipnextupdate = true;
  $('#timer').removeClass('timer-inspection');
  resetTimer();
  startTimer();
}

/* --------------------------- SOLVE FUNCTIONS --------------------------- */

// if user DNF, then add a DNF solve to the solve list, otherwise add a normal solve
function addSolve(time) {
  var dnf = time === 'dnf';
  // WCA uses 2 d.p. precision
  var tm = dnf ? 0.0 : time.toFixed(2);

  // time holds the WCA time to 2 d.p., precise time holds the actual time
  // which, because of updating every 10ms, will be max 3 d.p.
  var solve = {
    time: tm,
    precisetime: time,
    penalty: penalty,
    dnf: dnf,
    id: solveid,
    scramble: scramble,
    tags: '',
    comments: '',
    scrambletype: currentgenerator
  };
  
  // add solve to `solves` array
  solves.push(solve);
  // increment solveid so we can track/alter each solve individually
  solveid++;
  return solve;
}

// reset session, remove all solves
function resetSolves() {
  solves = [];
  updateAverages()
  resetSolveInfoPanel();
}

// delete all solves on page and add them all again
function reconstructPageSolves() {
  $('.solve-text').remove();
  solves.forEach(function (s) {
    addSolveToPage(s);
  });
}

// add the solve to the list of solves on the page
function addSolveToPage(solve) {
  // create the html element as a string, and append it to the list with jquery
  var t = $('.solves-list').append(createSolveElement(solve));

  //add solve handlers to all solves
  addSolveHandlers();

  // return the added element (as a jquery element)
  return t;
}

// returns a string that is the HTML of the solve element
function createSolveElement(solve) {
  // gets an object with the text of the element, and the classes that should be applied to it
  var d = createSolveElementData(solve);

  // create the element with the correct classes
  return '<span class="' + d.classes + '" id="solve-' + solve.id + '" data-solve-id="' + solve.id + '">' + d.text + '</span> ';
}

// HELPER FUNCTION, probably no reason to use
// returns an object with the text of the element, and the classes that should be applied to it
function createSolveElementData(solve) {
  var txt = solve.dnf ? '' : solve.precisetime.toFixed(settings.timerprecision)
  var classes = 'solve-text';
  if (solve.dnf) {
    txt = 'DNF';
    classes += ' solve-dnf';
  } else if (solve.penalty) {
    txt = (parseFloat(solve.precisetime) + penalty).toFixed(2) + ' (+' + solve.penalty + ')';
    classes += ' solve-penalty';
  } else {
    classes += ' solve-valid';
  }

  return { text: txt, classes: classes };
}

// adds click handlers to all solves
function addSolveHandlers() {
  // on clicking a solve in the solves list...
  $('.solve-text').click(function () {
    // get the solve id
    var aid = $(this).attr('data-solve-id')
    // find the solve in `solves` with the same id
    var solve = solves.find(function (x) { return x.id == aid; })

    // clear the `solve-active` class from whatever solve was previously selected
    $('.solve-active').removeClass('solve-active');
    // add the 'selected' style to the clicked solve
    $(this).addClass('solve-active');

    // set the target solve to the clicked solve and update the solve info panel
    targetsolve = solve;
    updateSolveInfoPane(targetsolve);
    
    // if the info box is hidden, show it, and we will probably also need to style it to remove the bottom margin
    $('.solve-info-box-container').show();
    styleLastListElementInRightCol();
  });
}

// change the text in the solve info panel to reflect the selected solve
function updateSolveInfoPane(solve) {
  if (solve.dnf) {
    $('#solve-info-time').text('DNF');
    $('#solve-info-penalty').text('+0');
  } else {
    $('#solve-info-time').text(solve.time);
    $('#solve-info-penalty').text('+' + solve.penalty);
  }
  $('#solve-info-type').text(solve.type);
  $('#solve-info-scramble').text(solve.scramble);
  $('#solve-info-id').text(solve.id);
}

// reset the solve info panel to default, empty
function resetSolveInfoPanel() {
  $('#solve-info-time').text('');
  $('#solve-info-penalty').text('');
  $('#solve-info-type').text('');
  $('#solve-info-scramble').text('');
  $('#solve-info-id').text('');

  $('.solve-info-box-container').hide();

  styleLastListElementInRightCol()
}

// get the target solve element, reapply all classes and change text
function updateTargetSolve() {
  var ts = $('#solve-' + targetsolve.id)

  // clear classes
  ts.removeClass();

  // get the text and classes data for the solve
  var d = createSolveElementData(targetsolve);

  // add appropriate classes and change text
  ts.addClass(d.classes);
  ts.text(d.text);
}

// adds listeners to solve-info panel buttons
function addButtonListeners() {
  // blur any clicked button so user can still use spacebar to start timer
  $('.solve-info-box button').click(function (e) {
    $(this).blur();
  });
  
  // on clicking the penalty button, cycle the penalty for the target solve
  $('.solve-info-box #penalty-button').click(function (e) {
    if (targetsolve) {
      if (targetsolve.penalty == 0) {
        targetsolve.penalty = 2;
      } else if (targetsolve.penalty == 2) {
        targetsolve.penalty = 4;
      } else {
        targetsolve.penalty = 0;
      }
      // update solve and info on screen
      updateTargetSolve();
      updateSolveInfoPane(targetsolve);
      updateAverages();
    }
  });
  
  // on clicking the dnf button, toggle DNF state for the target solve
  $('.solve-info-box #dnf-button').click(function (e) {
    if (targetsolve) {
      targetsolve.dnf = !targetsolve.dnf;
      // update solve and info on screen
      updateTargetSolve();
      updateSolveInfoPane(targetsolve);
      updateAverages();
    }
  });
  
  // on clicking the delete button, find the selected solve in `solves` and delete it
  $('.solve-info-box #delete-button').click(function (e) {
    var id = targetsolve.id;
    targetsolve = null;
    // find the solve in the `solves` array and delete it
    solves = solves.filter(function (x) {
      return x.id != id;
    })
    // remove the solve element from the solves list on page
    $('#solve-' + id).remove();
    // no solve is now selected, clear solve info
    resetSolveInfoPanel();
    // update averages due to solve being deleted
    updateAverages();
    updateSolvesCount();
  });

  // on clicking the reset button, delete all solves and reset page
  $('#reset-button').click(function (e) {
    $(this).blur();
    resetSolves();
    reconstructPageSolves();
    targetsolve = null;
    resetSolveInfoPanel();
    updateAverages();
    updateSolvesCount();
  });

  // on clicking the submit button, submit the session
  $('#submit-button').click(function (e) {
    //TODO: let users submit their times
  });
}

function updateSolvesCount() {
  $('#solve-count').text(solves.length)
}

/* --------------------------- AVERAGES FUNCTIONS --------------------------- */

// update the session averages panel
function updateAverages() {
  var sessionaverage = getSessionAverage();

  // get averages of 5, 12, 50. current averages are calculated by finding the average
  // of the n solves before the most recent
  var ao5 = getAO(5);
  var currentao5 = getAOatIndex(5, solves.length - 5);

  var ao12 = getAO(12);
  var currentao12 = getAOatIndex(12, solves.length - 12);

  var ao50 = getAO(50);
  var currentao50 = getAOatIndex(50, solves.length - 50);

  // lesss than three solves, can't have a session average
  if (solves.length < 3) {
    $('session-info-session-average').text('n/a');
  } else {
    $('#session-info-session-average').text(sessionaverage == 'dnf' ? 'DNF' : parseFloat(sessionaverage).toFixed(2));
  }
  
  // set the text for the averages
  $('#session-info-ao5').text(ao5.best == 'dnf' ? 'DNF' : parseFloat(ao5.best).toFixed(2));
  $('#session-info-ao12').text(ao12.best == 'dnf' ? 'DNF' : parseFloat(ao12.best).toFixed(2));
  $('#session-info-ao50').text(ao50.best == 'dnf' ? 'DNF' : parseFloat(ao50.best).toFixed(2));

  $('#session-info-current-ao5').text(currentao5.best == 'dnf' ? 'DNF' : parseFloat(currentao5).toFixed(2));
  $('#session-info-current-ao12').text(currentao12.best == 'dnf' ? 'DNF' : parseFloat(currentao12).toFixed(2));
  $('#session-info-current-ao50').text(currentao50.best == 'dnf' ? 'DNF' : parseFloat(currentao50).toFixed(2));

  // less than 5 solves, hide the averages box (not including session avg)
  if (solves.length < 5) {
    $('.ao5-line').hide();
    $('#session-info-averages-box').hide();
  } else {
    // otherwise, show the averages box and the ao5s
    $('.ao5-line').show();
    $('#session-info-averages-box').show();
  }

  // if there are enough solves to have an ao12, show the ao12s
  if (solves.length < 12) {
    $('.ao12-line').hide();
  } else {
    $('.ao12-line').show();
  }

  // if there are enough solves to have an ao50, show the ao50s
  if (solves.length < 50) {
    $('.ao50-line').hide();
  } else {
    $('.ao50-line').show();
  }
}

// gets the average of the session. 2 or more DNFs = DNF average (not sure if that's how it is meant to work though)
function getSessionAverage() {
  // counts the amount of DNFs found so far.
  var dnfs = 0;
  // holds the sum of all solve times
  var sum = 0;

  // maximum solve time
  var max = 0;
  // minimum solve time
  var min = 999;
  
  // loops through every solve...
  for (var i = 0; i < solves.length; i++) {
    var s = solves[i];

    // ...if it is a DNF, increment the DNFs counter
    if (s.dnf) {
      dnfs++;
      // if there are 2 or more DNFs in the session, the average is DNF
      if (dnfs > 1) {
        return 'dnf'
      }
    } else {
      // otherwise, add the WCA-precision time to the sum
      sum += parseFloat(s.time);

      // keep track of the maxmimum time found so far
      if (s.time > max) {
        max = s.time;
      }

      // keep track of the minimum time found so far
      if (s.time < min) {
        min = s.time;
      }
    }
  }

  // only one DNF found, so the average is not DNF but instead the DNF will be discounted
  // because the highest and lowest values are discarded. therefore we can set `min` to 0
  // so as to not discard any valid times
  if (dnfs === 1) {
    min = 0;
  }

  // discard the minimum and maximum solves
  sum -= parseFloat(min);
  sum -= parseFloat(max);

  // get the average of the remaining solves
  var avg = sum / (solves.length - 2);

  // return the average as a string
  return '' + avg;
}

// get best average of n consecutive solves, and associated info
function getAO(n) {
  // if there are less solves than n, we cannot make an average
  // return some default data instead
  if (solves.length < n) {
    return { averageof: n, best: 'N/A', index: -1 };
  }
  
  // the index of the first solve of the best average we found so far
  var bestindex = -1;
  // the best average found so far
  var best = 999;
  
  // loop through all sets of consecutive n solves
  for (var i = 0; i < solves.length - n + 1; i++) {
    // get the average of each solve
    var average = getAOatIndex(n, i);
    
    // if average isn't available for some reason, return some default data
    if (average === -1) {
      return { averageof: n, best: 'N/A', index: -1 };
    }
    // keep track of the best average so far, and the index of the start of that average
    if (average < best) {
      best = average;
      bestindex = i;
    }
  }
  // averageof: how many solves are considered in the average
  // best: if DNF, 'dnf', otherwise the best average
  // index: the index of `solves` of the first solve of the set of solves that have the best average
  return { averageof: n, best: best === 998 ? 'dnf' : best, index: bestindex };
}

// returns the average of n solves, starting at a specific `solves` index
function getAOatIndex(n, index) {
  // can't get an average because there are not enough values after index, or index<0, so return -1
  if (solves.length < index + n || index < 0) {
    return -1;
  }

  var sum = 0;
  var dnfs = 0;
  var max = 0;
  var min = 999;
  
  // loop through n solves starting at index `index`
  for (var j = 0; j < n; j++) {
    // if the solve is a DNF, increment the DNFs counter
    if (solves[index + j].dnf) {
      dnfs += 1;
    } else {
      // otherwise add the time to `sum`
      sum += parseFloat(solves[index + j].time);
      // keep track of the maximum solve...
      if (solves[index + j].time > max) {
        max = solves[index + j].time;
      }
      // ...and the minimum solve
      if (solves[index + j].time < min) {
        min = solves[index + j].time;
      }
    }
  }

  // if there are more than 1 DNF, the solve is a DNF. return 998
  //(a hacky default value, but it keeps some average code above working properly)
  if (dnfs > 1) {
    return 998;
  } else if (dnfs === 1) {
    // see session average code for reasoning for setting min to 0
    // tl;dr, DNF takes place of minimum valid solve
    min = 0;
  }

  // discard the minimum and maximum solves
  sum -= parseFloat(max);
  sum -= parseFloat(min);

  // calculate and the average of the remaining solves
  var average = sum / (n - 2);

  return average;
}

/* --------------------------- SCRAMBLE FUNCTIONS --------------------------- */

// gets a new scramble from the generator and displays it
function getScramble() {
  scramble = generators[currentgenerator].get()[0];
  // set the scramble text on the page
  $('#scramble').text(scramble);
  if (settings.colorise) {
    // colorise each part of the scramble for easier readability
    coloriseScramble();
  }
}

// colorises the scramble so certain side turns are colored the same
function coloriseScramble() {
  // the tokens we look for in each turn; every token that contains one of these will be
  // styled differently. not case sensitive
  var letters = ['U', 'D', 'F', 'B', 'L', 'R'];
  // get the scramble as an array of turns
  var parts = scramble.split(' ');
  // for every token in `parts`...
  var colorised = parts.map(function (x) {
    var a = '';
    // ... see if it contains one of the letters in `letters`, if so...
    letters.forEach(function (f) {
      if (x.indexOf(f) != -1 || x.indexOf(f.toLowerCase()) != -1) {
        // ... style it with a class depending on which letter it contains ...
        a = '<span class="s' + f + '">' + x + '</span>';
        return;
      }
    });
    // ... otherwise, it's an unknown turn, style it differently
    return a ? a : '<span class="sUnknown">' + x + '</span>';
  });
  // change the text on the page to the colorised version
  $('#scramble').html(colorised.join(' '));
}

/* --------------------------- SETTINGS FUNCTIONS --------------------------- */

// sets up the settings panel, and saves any changes to it
function initSettings() {
  // for every setting, get the value from settings and then find the appropriate checkbox and check/uncheck it as appropriate
  for (var setting in settings) {
    $('input[data-setting-name="' + setting + '"]').prop('checked', settings[setting]);
  }
  // on checkbox changed...
  $('#settings-list input').on('change', function (e) {
    // ... get the checkbox...
    var cb = $(this);
    // ... find out which setting it corresponds to ...
    var setting = cb.attr('data-setting-name');
    // ... see whether it is checked or unchecked ...
    var checked = cb.prop('checked');
    // ... and set the setting value in the `settings` array.
    settings[setting] = checked;

    // remove focus on the clicked checkbox, so user can still use spacebar to start solves
    cb.blur();

    // if certain settings are changed, execute their changes
    switch (setting) {
      case 'darkmode':
        setDarkMode(checked);
        break;
      case 'colorise':
        getScramble();
        break;
      default:
        break;
    }

    // save new settings to cookies
    Cookies.set('settings', settings, { expires: Infinity });
  });
}

// if dark mode is enabled, style the page with darkmode CSS
function setDarkMode(b) {
  if (b) {
    $('body').addClass('darkmode');
  } else {
    $('body').removeClass('darkmode');
  }
}

/**/

function styleLastListElementInRightCol() {
    $('.last-child').removeClass('last-child');
    $('#settings-list > li:visible:last, #solves-box-list > li:visible:last').addClass('last-child');
}

/* --------------------------- ENTRY FUNCTION --------------------------- */

// when the page is ready to do stuff
$(document).ready(function () {
  // get settings from cookies
  settings = Cookies.getJSON('settings') || defaultsettings;
  // set all settings checkboxes to the correct value
  // and add event listeners to checkboxes
  initSettings();

  // set the appropriate dark mode classes if dark mode is enabled
  setDarkMode(settings.darkmode);
  
  // get a new scramble on button press
  $('#getscramble').click(function () {
    getScramble();
    $(this).blur();
  });
  // get first scramble
  getScramble();
  // reset the timer
  resetTimer();
  // on clicking an entry in the 'select scramble type' dropdown...
  $('#scrambletypelist li a').on('click', function () {
    // if the scramble type is not currently disabled...
    if (!$(this).hasClass('disabled')) {
      // handle actually changing scramble type here
      $('#scrambletypetext').text($(this).text());
      currentgenerator = $(this).attr('data-scramble-type');
      $('#scrambletypelist li').removeClass('dropdown-selected');
      $(this).parent().addClass('dropdown-selected');
      // get a new scramble of the new scramble type
      getScramble();
    } else {
      //scramble type is currently disabled, do nothing
    }
  });
  // set the current scramble type to 3x3 by default
  // easier to do this by jquery 'click'ing the dropdown entry because we just set up a handler for it
  $('#scrambletypelist li a[data-scramble-type="3x3"]').click();

  // initialise solve list/settings tabs
  $('#right-col-tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
    styleLastListElementInRightCol();
  });

  // when first loading the page, hide the solve info box because no solves have been done yet
  resetSolveInfoPanel();

  // add listeners to solve info buttons
  addButtonListeners();
  
  // update averages (which also hides them in this case)
  updateAverages();
  updateSolvesCount();

  // handle space bar pressing. if a key was released...
  $('body').keyup(function (event) {
    // ... and the key was the space bar ...
    if (event.which == 32) {
      // ... and the timer is currently stopped ...
      if (timerState == 'stopped') {
        // ... and it's been more than 0.5s since the user stopped the timer ...
        if (!cantstartyet) {
          // ... and inspection is enabled ...
          if (settings.inspection) {
            // ... reset the timer and start inspection
            resetTimer();
            startInspection();
          } else {
            // otherwise just start the timer
            resetTimer();
            startTimer();
          }
        }
        // ... and the timer is currently running ...
      } else if (timerState == 'started') {
        // ... stop the timer and disable the user from starting it again for 0.5s
        stopTimer();
        cantstartyet = true;
        setTimeout(function () {
          cantstartyet = false;
        }, 500);
        // ... and the timer is in inspection time ...
      } else if (timerState == 'inspection') {
        // ... stop inspection time and start the timer
        stopInspection();
        // ... and the user took too long in inspection and DNF ...
      } else if (timerState == 'dnf') {
        // ... reset the timer and add a DNF solve to the list of solves
        var s = addSolve('dnf');
        addSolveToPage(s);
        resetTimer();
      }
    } else {
      // hitting any key should stop the timer
      if (timerState == 'started') {
        stopTimer();
        cantstartyet = true;
        setTimeout(function () {
          cantstartyet = false;
        }, 500);
      }
    }
  });
});
