var generators = {
  '3x3':new Scrambo().type('333')
}

var defaultsettings = {
  colorise: true,
  darkmode: false
}

var settings;

var scramble = ''
var timer = 0.0;
var timerState = 'stopped'
var doInspection = true;
var solvetablewidth = 6;
var penalty = 0;

var start = new Date().getTime();

function resetTimer() {
  timer = 0;
  $('#timer').text(timer.toFixed(2))
}

// start the timer
function startTimer() {
  start = new Date().getTime();
  timerState = 'started';
  updateTimer()
}

// called every 10ms while the timer is running
function updateTimer() {
  var time = new Date().getTime() - start;
  timer = time/1000;
  $('#timer').text(timer.toFixed(2))
  if(timerState == 'started') {
    setTimeout(function () {
      updateTimer()
    }, 10);
  }
}

// start inspection time
function startInspection() {
  $('#timer').addClass('timer-inspection')
  start = new Date().getTime();
  timer = 15.00;
  timerState = 'inspection'
  updateInspection()
}

// called every 10ms while inspection is happening
function updateInspection() {
  //TODO: fix timer 0.5s bug.
  var time = new Date().getTime() - start;
  var timer2 = time/1000;
  //for some reason the timer was cutting off the first 0.5s
  timer = 15.5 - timer2;
  if(timer > 0) {
    //within inspection time
    $('#timer').text(timer.toFixed(0))
    penalty = 0;
  } else if (timer <= 0 && timer > -2) {
    // +2 penalty
    $('#timer').text('+2 penalty')
    penalty = +2;
  } else if (timer <= -2) {
    // did not finish
    $('#timer').text('DNF')
    timerState = 'dnf'
  }

  setTimeout(function () {
    if(timerState == 'inspection') {
      updateInspection()
    }
  }, 10);
}

// stop the inspection time and start the timer
function stopInspection() {
  $('#timer').removeClass('timer-inspection')
  resetTimer();
  startTimer();
}

// stop the timer and add the solve to the list
function stopTimer() {
  timerState = 'stopped'
  var solvetime = timer.toFixed(2);
  addSolve(solvetime)
  updateSolvesListHandlers();
  getScramble();
}

// if user DNF, then add a DNF solve to the solve list, otherwise add a normal solve
function addSolve(time) {
  if(time === 'dnf') {
    addDNF();
  } else {
    addValidSolve(time)
  }
}

// adds a new solve time, and either styles it default
// or add a different stlye if the solve has a penalty
function addValidSolve(time) {
  if(penalty > 0) {
    //penalty: do styling/adding classes here
    var t = (+time+(+penalty)) + ' (+2)'
    var cell = addSolveHelper(t);
    cell.addClass('solve-penalty')
  } else {
    //normal, valid solve
    var cell = addSolveHelper(time);
    cell.addClass('solve-valid')
  }
}

// adds a new solve time and styles it with the DNF style
function addDNF() {
  var cell = addSolveHelper('DNF');
  cell.addClass('solve-dnf')
}

// adds a new cell with the most recent solve, and return that cell
function addSolveHelper(text) {
  //TODO: fix solve list so it actually works like a list. maybe abandon table idea?
  var r;
  var emptycells = $('#solves td:empty')
  if(emptycells.length) {
    r = emptycells.first()
  } else {
    $('#solves tr:last').parent().append('<tr>' + '<td class="solve"></td>'.repeat(solvetablewidth) + '</tr>')
    emptycells = $('#solves td:empty')
    r = emptycells.first()
  }
  r.html('<a href="#" class="solve-link">' + text + '</a>');
  return r;
}

function updateSolvesListHandlers() {
  $('.solve-link').click(function() {
    $(this).parents('td').html('')
  })
}

function getScramble() {
    scramble = generators['3x3'].get()[0]
    $('#scramble').text(scramble)
    if(settings.colorise) {
      coloriseScramble();
    }
}

//colorises the scramble so certain side turns are colored the same
function coloriseScramble() {
  var letters = ['U','D','F','B','L','R'];
  var parts = scramble.split(' ')
  var colorised = parts.map(x => {
    var a = ''
    letters.forEach(f => {
      if(x.indexOf(f) != -1) {
        a = '<span class="s'+f+'">'+x+'</span>'
        return;
      }
    })
    return a?a:'<span class="sUnknown">'+x+'</span>'
  })
  $('#scramble').html(colorised.join(' '))
}

function initSettings() {
  for(var setting in settings) {
    $('input[data-setting-name="' + setting + '"]').prop('checked',settings[setting])
  }
  $('#settings-list input').on('change', function(e) {
    var cb = $(this)
    var setting = cb.attr('data-setting-name')
    settings[setting] = cb.prop('checked')

    //save new settings to cookies
    Cookies.set('settings', settings)
    console.log(settings)
  })
}

//when the page is ready to do stuff
$(document).ready(() => {
  //get settings from cookies
  settings = Cookies.getJSON('settings') || defaultsettings
  //set all settings checkboxes to the correct value
  //and add event listeners to checkboxes
  initSettings();

  //get a new scramble on button press
  $('#getscramble').click(() => {getScramble()});
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
    e.preventDefault()
    $(this).tab('show')
  })

  //handle spacebar pressing
  $('body').keyup(event => {
    if(event.which == 32){
      if(timerState == 'stopped'){
        if(doInspection) {
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
        addSolve('dnf')
        resetTimer();
      }
    }
  })
})
