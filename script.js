
// different puzzle generators
var generators = {
  '2x2':new Scrambo().type('222'),
  '3x3':new Scrambo().type('333'),
  '4x4':new Scrambo().type('444'),
  '5x5':new Scrambo().type('555'),

  'pyraminx':new Scrambo().type('pyram'),
};

// default settings, in case the cookie is not set
var defaultsettings = {
  colorise: true,
  darkmode: true,
  inspection: true,
  hidetimer: false
};

// holds the current settings
var settings;

var solves = [];
var solveid = 0;
var targetsolve = null;

var inspectiontime = 15;

var currentgenerator = '3x3'
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
  timerState = 'stopped'
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
  timer = inspectiontime;
  timerState = 'inspection';
  updateInspection();
}

// called every 10ms while the timer is running
function updateTimer() {
  //so that this function isn't erroneously called an extra time after stopInspection()
  if(skipnextupdate) {
    return;
  }
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
  timer = (inspectiontime + 0.5) - timer2;
  if(timer > 0) {
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
  $('#timer').text(solvetime);
  var s = addSolve(solvetime);
  console.log(s)
  addSolveToPage(s);
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
    comments: '',
    type: currentgenerator
  };

  solves.push(solve);
  solveid++;
  return solve;
}

function resetSolves() {
  solves = [];
}

function reconstructPageSolves() {
  $('.solve-text').remove();
  solves.forEach(function(s) {
    addSolveToPage(s);
  });
}

function addSolveToPage(solve) {


  var t = $('.solves-list').append(createSolveElement(solve));

  //add solve handlers to all solves
  addSolveHandlers();
}

function createSolveElement(solve) {

  var d = createSolveElementData(solve);

  return '<span class="' + d.classes + '" id="solve-' + solve.id + '" data-solve-id="' + solve.id + '">'+d.text+'</span> ';
}

function createSolveElementData(solve) {
  var sid = solve.id;
  var txt = solve.time;
  var classes = 'solve-text';
  if(solve.dnf) {
    txt = 'DNF';
    classes += ' solve-dnf';
  } else if(solve.penalty) {
    txt = (parseFloat(solve.time) + penalty).toFixed(2) + ' (+' + solve.penalty + ')';
    classes += ' solve-penalty';
  } else {
    classes += ' solve-valid';
  }

  return {text:txt, classes:classes};
}

function addSolveHandlers() {
  $('.solve-text').click(function() {
    var aid = $(this).attr('data-solve-id')
    var solve = solves.find(function(x) {return x.id == aid;})

    $('.solve-active').removeClass('solve-active');
    $(this).addClass('solve-active');

    targetsolve = solve;
    updateSolveInfoPane(targetsolve);
  });
}

function updateSolveInfoPane(solve) {
  if(solve.dnf) {
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

function resetSolveInfoPane() {
  $('#solve-info-time').text('');
  $('#solve-info-penalty').text('');
  $('#solve-info-type').text('');
  $('#solve-info-scramble').text('');
  $('#solve-info-id').text('');
}

function updateTargetSolve() {
  var ts = $('#solve-'+targetsolve.id)

  ts.removeClass();

  var d = createSolveElementData(targetsolve);

  ts.addClass(d.classes);
  ts.text(d.text);
}

function getScramble() {
    scramble = generators[currentgenerator].get()[0];
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
      if(x.indexOf(f) != -1 || x.indexOf(f.toLowerCase()) != -1) {
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
    var checked = cb.prop('checked');
    settings[setting] = checked;

    cb.blur();

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

function addButtonListeners() {
  $('.solve-info-box button').click(function(e) {
    $(this).blur();
  });
  $('.solve-info-box #penalty-button').click(function(e) {
    if(targetsolve) {
      if(targetsolve.penalty == 0) {
        targetsolve.penalty = 2;
      } else if(targetsolve.penalty == 2){
        targetsolve.penalty = 4;
      } else {
        targetsolve.penalty = 0;
      }
      updateTargetSolve();
      updateSolveInfoPane(targetsolve);
    }
  });

  $('.solve-info-box #dnf-button').click(function(e) {
    if(targetsolve) {
      targetsolve.dnf = !targetsolve.dnf;
      updateTargetSolve();
      updateSolveInfoPane(targetsolve);
    }
  });

  $('.solve-info-box #delete-button').click(function(e) {
    var id = targetsolve.id;
    targetsolve = null;
    solves = solves.filter(function(x) {
      return x.id != id;
    })
    $('#solve-' + id).remove();
    resetSolveInfoPane();
  });

  $('#reset-button').click(function(e) {
    $(this).blur();
    resetSolves();
    reconstructPageSolves();
    targetsolve = null;
    resetSolveInfoPane();
  });

  $('#submit-button').click(function(e) {
    //TODO: let users submit their times
  });
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
  $('#getscramble').click(function() {
    getScramble();
    $(this).blur();
  });
  //get first scramble
  getScramble();
  //reset the timer
  resetTimer();
  //select scramble type dropdown handler
  $('#scrambletypelist li a').on('click', function(){
    if(!$(this).hasClass('disabled')) {
      //handle actually changing scramble type here
      $('#scrambletypetext').text($(this).text());
      currentgenerator = $(this).attr('data-scramble-type');
      $('#scrambletypelist li').removeClass('dropdown-selected');
      $(this).parent().addClass('dropdown-selected');
      getScramble();
    } else {
      //scramble type is currently disabled, do nothing
    }
  });
  $('#scrambletypelist li a[data-scramble-type="3x3"]').click();

  //init solve list/settings tabs
  $('#right-col-tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  addButtonListeners();

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
        var s = addSolve('dnf');
        addSolveToPage(s);
        resetTimer();
      }
    }
  });
});
