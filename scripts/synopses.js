//jscs:disable requireArrowFunctions

'use strict';

var template = document.querySelector('#t');
template.isAuthenticated = false;
var DEBUG = template.DEBUG;

// console.log('Initialising Synopses App');

var PATIENT = location.pathname === '/patient/';

var link = document.querySelector('#bundle');
link.addEventListener('load', function(e) {
  /*if (typeof template.$.drawerPanel !== 'undefined') {
    template.$.drawerPanel.addEventListener('paper-header-transform',
      function(e) {
        var d = e.detail;
        //...
        // Hide filters in narrow view
        var shouldCollapse = (d.y >= d.height - d.condensedHeight);
        document.querySelector('#filters').hidden = shouldCollapse;
      });
  }*/

  if (DEBUG) {
    console.warn('DEBUG mode loading');
    window.localStorage.clear();
  } else {
    template.handleLogin(null, null, true);
  }
});

template.threadsLoaded = [];
template.selectedPatient = false;

template.isDrawerVisible = true;
template.drawerToggleClass = '';
template.actionOpened = false;
template.actionOpenClose = function() {
  template.actionOpened = !template.actionOpened;
};

template.isDashboardVisible = true;
template.openDashboard = function() {
  this.isDashboardVisible = true;
};
template.refreshDashboard = function() {
  this.$.dashcontainer.init();
};
template.openRecord = function(e) {
  e.stopPropagation();
  var record = e.detail.record;
  // Identify record
  var targetThread = this.threads.filter(
    function(t) { return t.messages[0].id === record.id; });
  if (targetThread.length === 0) { return console.warn('Invalid thread'); }
  var messageData = targetThread[0].messages[0];
  // Identify patient
  var targetPatient = this.patientstoday.filter(
    function(p) { return p.id === '' + messageData.from.id; });
  if (targetPatient.length === 0) { return console.warn('Invalid patient'); }
  // Assign
  this.selectedPatient = targetPatient[0];
  // Switch to inbox
  this.isDashboardVisible = false;
  this.headerTitle = '';
  this.headerClass = this._computeMainHeaderClass();
  this.loadRecords();
};

template.previousSearches = [
  'to: me',
  'alpha',
  'beta'
];

template.loadPatients = function() {
  var ajax1 = document.createElement('iron-ajax');
  ajax1.auto = true;
  ajax1.url = '/api/patients';
  ajax1.addEventListener('response', function(e) {
    template.patientstoday = e.detail.response.patients;
    template.patientstodayLoaded = e.detail.response.patients;
  });
};

template.loadPatientsPast = function() {
  var ajax1 = document.createElement('iron-ajax');
  ajax1.auto = true;
  ajax1.url = '/data/patients.json';
  ajax1.addEventListener('response', function(e) {
    template.patientspast = e.detail.response.patients;
    template.patientspastLoaded = e.detail.response.patients;
  });
};

template.dashboardInfo = {
  date: '-',
  appointments: '-',
  newmessages: '-',
  labresults: '-'
};

template.loadRecords = function() {
  var ajax = document.createElement('iron-ajax');
  ajax.auto = true;
  var hasPatient = (
    template.selectedPatient &&
    typeof template.selectedPatient.id !== 'undefined'
  );
  if (!hasPatient && PATIENT) {
    console.warn('No selected patient!'); return;
  } else if (!hasPatient) {
    ajax.url = '/api/threads';
  } else {
    ajax.url = '/api/patient/' + template.selectedPatient.id + '/threads';
  }
  ajax.addEventListener('response', function(e) {
    var threads = e.detail.response.threads;
    threads.forEach(function(t) {
      if (!t.messages || t.messages.length === 0) { return; }
      var topMsg = t.messages[0];
      var patientId = topMsg.from.id;
      var ident = 'P-' + patientId + '-T-' + topMsg.id;
      var itemUnread = window.localStorage.getItem(ident + '-unread');
      if (itemUnread === 'false') {
        topMsg.unread = false;
      }
      var itemStar = window.localStorage.getItem(ident + '-star');
      if (itemStar !== null) {
        topMsg.starred = itemStar;
      }
    });
    template.threads = threads;
    template.threadsLoaded = threads;
    template.dashboardInfo = e.detail.response.intoday;
    template.deselectAll();
    document.body.classList.remove('loading');
  });
  ajax.addEventListener('error', function(e) {
    template.threads = [];
    template.deselectAll();
  });
};

template.runSearch = function(e) {
  template.showLoadingSpinner();
  template.deselectAll();
  var q = e.detail.value.toLowerCase();
  if (template.selectedPatient) {
    template.inboxSelect();
  }
  if (q.length < 3) {
    template.patientstoday = template.patientstodayLoaded;
    template.threads = template.threadsLoaded;
    template.hideLoadingSpinner();
    return;
  }
  // Filter people
  var ppt = [];
  template.patientstodayLoaded.forEach(function(person) {
    if (person.name.toLowerCase().indexOf(q) !== -1) {
      ppt.push(person);
    }
  });
  template.patientstoday = ppt;
  // Filter threads
  var tt = [];
  template.threadsLoaded.forEach(function(thread) {
    var hasMatch = false;
    thread.messages.forEach(function(message) {
      if (hasMatch) { return; }
      if (message.snippet.toLowerCase().indexOf(q) !== -1 ||
      message.subject.toLowerCase().indexOf(q) !== -1) {
        hasMatch = true;
      }
    });
    if (hasMatch === true) {
      tt.push(thread);
    }
  });
  template.threads = tt;
  template.isDashboardVisible = false;
  template.hideLoadingSpinner();
};

template.filterBy = function(e, f, g) {
  template.deselectAll();
  var qs = this.$.filters.selectedItem.querySelector('iron-icon');
  if (qs === null) { return; }
  var theIcon = qs.icon;
  if (theIcon === 'select-all') {
    template.threads = template.threadsLoaded;
    return;
  }
  // Filter threads
  var tt = [];
  template.threadsLoaded.forEach(function(thread) {
    var hasMatch = false;
    thread.messages.forEach(function(message) {
      if (hasMatch) { return; }
      if (
        (theIcon === 'icons:star' && message.starred) ||
        (message.icon === theIcon)
      ) {
        hasMatch = true;
      }
    });
    if (hasMatch === true) {
      tt.push(thread);
    }
  });
  template.threads = tt;
};

template._onLabelTap = function(e) {
  var theLabel = e.detail.label;
  this.$.filters.select('' + (this.$.filters.items.length - 2));
  // Filter threads
  var tt = [];
  template.deselectAll();
  template.threadsLoaded.forEach(function(thread) {
    var hasMatch = false;
    thread.messages.forEach(function(message) {
      if (hasMatch) { return; }
      if (message.label === theLabel) {
        hasMatch = true;
      }
    });
    if (hasMatch === true) {
      tt.push(thread);
    }
  });
  template.threads = tt;
};

template.mockLogin = function() {
  this.isAuthenticated = true;
  if (PATIENT) { template.loadPatientFile(); return; }
  // Cached data? We're already using it. Bomb out before making unnecessary requests.
  if (template.threads && template.patientstoday) { return; }
  if (DEBUG) { this.loadPatientsPast(); }
  this.loadRecords();
};

template.handleLogin = function(event, data, silentMode) {
  if (PATIENT) { return; } // not supported yet
  // console.log('handleLogin started');
  var ajax = document.createElement('iron-ajax');
  ajax.auto = true;
  ajax.url = '/api/login';
  ajax.method = 'POST';
  if (silentMode) {
    ajax.body = '{"username":"", "password":""}';
  } else {
    ajax.body = '{"username":"' + event.detail.username +
    '", "password":"' + event.detail.password + '"}';
  }
  ajax.addEventListener('response', function(e) {
    var r = e.detail.response;
    if (r.flag !== 'success') {
      if (!silentMode) {
        // Alert the user
        window.alert('Invalid login or service unavailable, please try again.');
      }
      return false;
    }
    // Initialise the application
    template.isAuthenticated = true;
    template.loadPatients();
    template.loadRecords();
    template.$.dashcontainer.init();
  });
  ajax.addEventListener('error', function(e) {
    console.warn(e);
    window.alert('Could not log in');
  });
};

function populateRecord(record, button) {
  // Switch to appropriate tab
  // var skip = button.getAttribute('icon');
  setTimeout(function() {
    var goto = parseInt(button.dataset.tab);
    template.$.addrecord.$.recordform.selected = goto;
  }, 100);

  // Populate DATA forms
  var theForm = template.$.addrecord.$.formtypedata;
  if (record) {
    for (var key in record) {
      // console.log(key, record[key]);
      var theInput =
      theForm.querySelector('paper-input[name="' + key + '"]') ||
      theForm.querySelector('input[name="' + key + '"]');
      if (theInput === null) {
        theInput = theForm.querySelector('select[name="' + key + '"]');
        if (theInput === null) {
          console.warn(key + ' not found in record form');
        } else {
          theInput.value = record[key];
        }
      } else if (theInput.type === 'radio') {
        theInput = theForm.querySelector(
          'input[name="' + key + '"]' +
          '[value="' + record[key] + '"]'
        );
        if (theInput !== null) {
          theInput.checked = true;
        }
      } else {
        theInput.value = record[key];
      }
    }

  } else {
    theForm.reset();
  }
}

function populateProfile(profile, button, dialog) {
  var theForm = dialog.querySelector('form#patientform');
  if (!profile) { return false; }
  // Populate forms
  for (var key in profile) {
    // console.log(key, profile[key]);
    var theInput =
    theForm.querySelector('paper-input[name="' + key + '"]') ||
    theForm.querySelector('gold-email-input[name="' + key + '"]') ||
    theForm.querySelector('input[name="' + key + '"]');
    if (theInput !== null) {
      theInput.value = profile[key];
      theInput = theForm.querySelector('input[name="' + key + '"]');
      if (theInput !== null) {
        theInput.value = profile[key];
      }
    }
  }
  theForm.parentElement.$.title = 'Edit patient file';
  theForm.action = '/api/patient/' + profile.id + '/save';
  return true;
}

template.openDialog = function(e) {
  template.actionOpened = false;
  var button = e.target;
  while (!button.hasAttribute('data-dialog') && button !== document.body) {
    button = button.parentElement;
  }
  if (!button.hasAttribute('data-dialog')) {
    return;
  }
  var id = button.getAttribute('data-dialog');
  var dialog = template.$[id].$.dialog;
  if (dialog) {
    if (id === 'addrecord') {

      var ajax = document.createElement('iron-ajax');
      ajax.auto = true;
      ajax.url = '/api/patient/' + template.selectedPatient.id + '/profile';
      ajax.addEventListener('error', function(e) {
        // console.warn(e);
      });
      ajax.addEventListener('response', function(e) {
        populateRecord(e.detail.response.profile.record, button);

        dialog.open();
      });

    } else if (button.id === 'editpatient') {

      var ajax2 = document.createElement('iron-ajax');
      ajax2.auto = true;
      ajax2.url = '/api/patient/' + template.selectedPatient.id + '/profile';
      ajax2.addEventListener('error', function(e) {
        // console.warn(e);
      });
      ajax2.addEventListener('response', function(e) {
        populateProfile(e.detail.response.profile, button, dialog);

        dialog.open();
      });

    } else {

      dialog.open();

    }
  }
};

template.inboxSelect = function(e) {
  this.selectedPatient = false;
  this.isDashboardVisible = false;
  this.headerTitle = this._computeHeaderTitle(0);
  // this.headerClass = this._computeMainHeaderClass();
  this.loadRecords();
};

template.toggleVisibility = function(e) {
  this.isDrawerVisible = !this.isDrawerVisible;
  this.drawerToggleClass = (this.isDrawerVisible) ? '' : 'active';
};

template.patientSelect = function(e) {
  this.isDashboardVisible = false;
  this.selectedPatient = e.model.item;
  this.headerTitle = '';
  this.headerClass = this._computeMainHeaderClass();
  this.loadRecords();
};

template._onThreadExpand = function(e) {
  var threadId = e.detail.thread.id;
  var patientId = e.detail.thread.from.id;
  if (template.patientstodayLoaded) {
    template.patientstodayLoaded.forEach(function(person) {
      if (person.id === patientId) {
        template.selectedPatient = person;
        template.headerTitle = '';
        template.headerClass = template._computeMainHeaderClass();
      }
    });
  }
  // Store unread status
  if (threadId >= 0) {
    var ident = 'P-' + patientId + '-T-' + threadId + '-unread';
    window.localStorage.setItem(ident, false);
  }
  // Close other threads
  // template.$.threadlist.items.forEach(function(thread) {
  //   if (thread.thread === e.detail.thread) { return; }
  //   if (thread.showfulltext) {
  //     thread.showfulltext = false;
  //     thread.$.fulltext.animate([
  //       {'max-height': 200}, {'max-height': 0}
  //     ], {duration: 50});
  //   }
  // });
};

template._onThreadStarred = function(e) {
  var thread = e.detail.thread.thread;
  // Store starred status
  if (thread.id >= 0) {
    var ident = 'P-' + thread.from.id + '-T-' + thread.id + '-star';
    window.localStorage.setItem(ident, thread.starred);
  }
};

template._onThreadSelect = function(e) {
  e.stopPropagation();
  if (template.selectedThreads.indexOf(e.detail.thread) === -1) {
    template.selectedThreads.push(e.detail.thread);
  } else if (!e.detail.thread.selected) {
    var ts = [];
    template.selectedThreads.forEach(function(thread) {
      if (thread !== e.detail.thread) { ts.push(thread); }
    });
    template.selectedThreads = ts;
  }
  template.headerClass = template._computeMainHeaderClass(
    template.narrow, template.selectedThreads.length);
};

template.deselectAll = function(e) {
  template.selectedThreads.forEach(function(thread) {
    thread.selected = false;
  });
  template.selectedThreads = [];
  template.headerClass = template._computeMainHeaderClass(
    template.narrow, template.selectedThreads.length);
};

template.patientProfileSaved = function(e) {
  // TODO: propagate patient_id from API and select
  // console.log(e);
  template.loadPatients();
};

template.patientRecordSaved = function(e) {
  template.loadPatients();
  setTimeout(function() {
    template.loadRecords();
  }, 100);
};

template.loadPatientFile = function() {
  var patientHash = location.search.replace('?','');
  var ajax1 = document.createElement('iron-ajax');
  ajax1.auto = true;
  ajax1.url = '/api/patient/' + patientHash;
  ajax1.addEventListener('response', function(e) {
    if (e.detail.response.flag === 'fail') {
      window.alert('Looks like your code is incorrect,\n' +
        'contact your clinic for a new one.');
      return;
    }
    template.selectedPatient = e.detail.response.patient;
    template.loadRecords();
  });
  ajax1.addEventListener('error', function(e) {
  });
};

template.shareThreads = function() {
  // TODO: Template
  var messageBody = 'PATIENT RECORD\n------------------------------\n' +
    'STRICTLY CONFIDENTIAL\n------------------------------\n';
  this.selectedThreads.forEach(function(thread) {
    messageBody += '\n' +
      thread.$.addressline.innerText +
      thread.$.subjectline.innerText +
      thread.$.fullbody.innerText +
      '\n';
  });

  messageBody += '\n\nRecords provided by Synopses.ch - please visit our ' +
    'site for more information.\nThis e-mail message and any attachments ' +
    'to it contain confidential information which is for the sole attention' +
    ' and use of the intended recipient. Please notify us at once if you ' +
    'think that it may not be intended for you, and delete it immediately. ' +
    'Thank you.';
  messageBody = messageBody.replace(/\n/g, '%0D%0A');
  messageBody = 'mailto:?subject=Synopses Shared Record&body=' + messageBody;
  window.location.href = messageBody;
};
