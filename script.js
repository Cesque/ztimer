var generators = {
  '3x3':new Scrambo().type('333')
}

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

function startTimer() {
  start = new Date().getTime();
  timerState = 'started';
  updateTimer()
}

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

function startInspection() {
  $('#timer').addClass('timer-inspection')
  start = new Date().getTime();
  timer = 15.00;
  timerState = 'inspection'
  updateInspection()
}

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

function stopInspection() {
  $('#timer').removeClass('timer-inspection')
  resetTimer();
  startTimer();
}

function stopTimer() {
  timerState = 'stopped'
  var solvetime = timer.toFixed(2);
  /*var tooltip = $('#solves').append($('<tr><td>' + solvetime + '</td>' +
  '<td><span class="solvescramble">' + scramble + '</span></td>' +
  '<td><button type="button" class="btn btn-danger btn-xs deletesolvebtn">Delete</button></td></tr>'))*/
  addSolve(solvetime)
  updateSolvesListHandlers();
  getScramble();
}

function addSolve(time) {
  if(time === 'dnf') {
    addDNF();
  } else {
    addValidSolve(time)
  }
}

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

function addDNF() {
  var cell = addSolveHelper('DNF');
  cell.addClass('solve-dnf')
}

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
    coloriseScramble();
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

//when the page is ready to do stuff
$(document).ready(() => {
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

  //set up first row in solves list
  $('#solves').append('<tr>' + '<td class="solve"></td>'.repeat(solvetablewidth) + '</tr>')

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
