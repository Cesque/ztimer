
// different puzzle generators
var generators = {
  '3x3':new Scrambo().type('333')
};

// default settings, in case the cookie is not set
var defaultsettings = {
  colorise: true,
  darkmode: false,
  inspection: true,
  hidetimer: true
};

// holds the current settings
var settings;

var solves = [];
var solveid = 0;

// the current scramble as a string
var scramble = '';

// the current timer / inspection timer (not rounded)
var timer = 0.0;
var penalty = 0;
// timer state: stopped, started, inspection, dnf
var timerState = 'stopped';

var skipnextupdate = false;

var start = new Date().getTime();

function resetTimer() {
  timer = 0;
  $('#timer').text(timer.toFixed(2));
}

// start the timer
function startTimer() {
  skipnextupdate = false;
  start = new Date().getTime();
  timerState = 'started';
  updateTimer();
}


// start inspection time
function startInspection() {
  skipnextupdate = false;
  $('#timer').addClass('timer-inspection');
  start = new Date().getTime();
  timer = 15.00;
  timerState = 'inspection';
  updateInspection();
}

// called every 10ms while the timer is running
function updateTimer() {
  //so that this function isn't erroneously called an extra time after stopInspection()
  var time = new Date().getTime() - start;
  timer = time/1000;
  if(settings.hidetimer) {
    $('#timer').text('solving');
  } else {
      $('#timer').text(timer.toFixed(2));
  }
  if(timerState == 'started') {
    setTimeout(function () {
      updateTimer();
    }, 10);
  }
}

// called every 10ms while inspection is happening
function updateInspection() {
  //so that this function isn't erroneously called an extra time after stopInspection()
  if(skipnextupdate) {
    return;
  }
  //TODO: fix timer 0.5s bug.
  var time = new Date().getTime() - start;
  var timer2 = time/1000;
  //for some reason the timer was cutting off the first 0.5s
  timer = 15.5 - timer2;
  if(timer > 0) {
    //within inspection time
    $('#timer').text(timer.toFixed(0));
    penalty = 0;
  } else if (timer <= 0 && timer > -2) {
    // +2 penalty
    $('#timer').text('+2 penalty');
    penalty = +2;
  } else if (timer <= -2) {
    // did not finish
    $('#timer').text('DNF');
    timerState = 'dnf';
  }

  setTimeout(function () {
    if(timerState == 'inspection') {
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

// stop the timer and add the solve to the list
function stopTimer() {
  skipnextupdate = true;
  timerState = 'stopped';
  var solvetime = timer.toFixed(2);
  $('timer').text(solvetime);
  addSolve(solvetime);
  updateSolvesListHandlers();
  getScramble();
}

// if user DNF, then add a DNF solve to the solve list, otherwise add a normal solve
function addSolve(time) {
  var dnf = time === 'dnf';
  var tm = dnf ? 0.0 : time;

  var solve = {
    time: tm,
    penalty: penalty,
    dnf: dnf,
    id: solveid,
    scramble: scramble,
    tags: '',

  };

  solves.push(solve);
  return solve;
}

function updateSolvesListHandlers() {
  $('.solve-link').click(function() {
    $(this).parents('td').html('');
  });
}

function getScramble() {
    scramble = generators['3x3'].get()[0];
    $('#scramble').text(scramble);
    if(settings.colorise) {
      coloriseScramble();
    }
}

//colorises the scramble so certain side turns are colored the same
function coloriseScramble() {
  var letters = ['U','D','F','B','L','R'];
  var parts = scramble.split(' ');
  var colorised = parts.map(function(x) {
    var a = '';
    letters.forEach(function(f) {
      if(x.indexOf(f) != -1) {
        a = '<span class="s'+f+'">'+x+'</span>';
        return;
      }
    });
    return a?a:'<span class="sUnknown">'+x+'</span>';
  });
  $('#scramble').html(colorised.join(' '));
}

function initSettings() {
  for(var setting in settings) {
    $('input[data-setting-name="' + setting + '"]').prop('checked',settings[setting]);
  }
  $('#settings-list input').on('change', function(e) {
    var cb = $(this);
    var setting = cb.attr('data-setting-name');
    settings[setting] = cb.prop('checked');

    //save new settings to cookies
    Cookies.set('settings', settings);
  });
}

function setDarkMode(b) {
  if (b) {
    $('body').addClass('darkmode');
  } else {
    $('body').removeClass('darkmode');
  }
}

//when the page is ready to do stuff
$(document).ready(function() {
  //get settings from cookies
  settings = Cookies.getJSON('settings') || defaultsettings;
  //set all settings checkboxes to the correct value
  //and add event listeners to checkboxes
  initSettings();

  setDarkMode(settings.darkmode);
  //get a new scramble on button press
  $('#getscramble').click(getScramble);
  //get first scramble
  getScramble();
  //reset the timer
  resetTimer();
  //select scramble type dropdown handler
  $('#scrambletypelist li a').on('click', function(){
    if(!$(this).hasClass('disabled')) {
      //handle actually changing scramble type here
      $('#scrambletypetext').text($(this).text());
    } else {
      //scramble type is currently disabled, do nothing
    }
  });

  //init solve list/settings tabs
  $('#right-col-tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  //handle spacebar pressing
  $('body').keyup(function(event) {
    if(event.which == 32){
      if(timerState == 'stopped'){
        if(settings.inspection) {
          resetTimer();
          startInspection();
        } else {
          resetTimer();
          startTimer();
        }
      } else if (timerState == 'started'){
        stopTimer();
      } else if(timerState == 'inspection') {
        stopInspection();
      } else if(timerState == 'dnf') {
        addSolve('dnf');
        resetTimer();
      }
    }
  });
});
