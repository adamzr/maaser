// Utility Functions

var MONTH_NAME = ["January", "February", "March", 
"April", "May", "June", "July", "August", "September", 
"October", "November", "December"];

function formatDate(date){
	return MONTH_NAME[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}

function parseDate(dateToParse){
	try{
		var parsedDate = Date.parse(dateToParse);
		if(!parsedDate){
			parsedDate = new Date(dateToParse);
		}
		return parsedDate;
	}
	catch(e){
		console.error(e);
		return new Date();
	}
}

function parseNumber(numberToParse){
	try{
		if(typeof numberToParse === "number"){
			return numberToParse;
		}
		return +numberToParse.replace(/[^\d\.-]/g,'');
	}
	catch(e){
		console.error(e);
		return 0;
	}
}

/**
 * Format a number as a string with commas separating the thousands.
 * @param x - The number to be formatted (e.g. 10000)
 * @return A string representing the formatted number (e.g. "10,000")
 */
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// jQuery Mobile Views
var App = Em.Application.create();

// Base classes for jQueryMobile Support
// In a 'real' implementation, this should be broken out into its own Ember.js module/extension.
App.MobileBaseView = Em.View.extend({
    attributeBindings:['data-role']
});

App.PageView = App.MobileBaseView.extend({
    'data-role': 'page'
});

App.ToolbarBaseView = App.MobileBaseView.extend({
    attributeBindings:['data-position'],
    'data-position': function() {
        if (this.get('isFullScreen')) {
            return 'fullscreen'
        }

        if (this.get('isFixed')) {
            return 'fixed'
        }
        return ''
    }.property('isFixed', 'isFullScreen').cacheable(),

    isFixed: true,
    isFullsScreen: false
});

App.HeaderView = App.ToolbarBaseView.extend({
    'data-role': 'header'
});

App.ContentView = App.MobileBaseView.extend({
    'data-role': 'content'
});

App.FooterView = App.ToolbarBaseView.extend({
    'data-role': 'footer'
});

var dbg;

App.ListItemView = Em.View.extend({
    tagName: 'li',
	didInsertElement: function() {
        $(".Date").parent("li").attr("data-role","list-divider");
    },
	delete: function(event){
		App.entriesController.deleteEntry(event.view.content);
	},
	edit: function(event){
		var editView = App.EditEntryDialogView.create();
		editView.content = event.view.content;
        App.set('editView', editView);
        editView.append();
		// $.mobile.changePage($('#' + editView.get('elementId')), {transition: 'pop', role: 'dialog'});
	}
});

App.ListView = Em.CollectionView.extend({
    attributeBindings: ['data-role', 'data-theme', 'data-divider-theme', 'data-split-theme', 'data-split-icon'],
    'data-role':'listview',
	'data-theme' :'d',
 	'data-divider-theme':'d',
	'data-split-theme': 'd',
	'data-split-icon' : 'delete',
    tagName: 'ul',
	elementId: 'entrylist',
    itemViewClass: App.ListItemView,

    // Observe the attached content array's length and refresh the listview on the next RunLoop tick.
    contentLengthDidChange: function(){
        var _self = this;
        Em.run.next(function() {
            _self.$().listview('refresh');
        });

		// $("#entrylist").listview({
		// 		  autodividers: true,
		// 
		// 		  // the selector function is passed a <li> element from the listview;
		// 		  // it should return the appropriate divider text for that <li>
		// 		  // element as a string
		// 		  autodividersSelector: function ( li ) {
		// 		    var out = $(li).children("h3").data("date");
		// 		    return out;
		// 		  }
		// 		});
    }.observes('content.length'),

	emptyView: Ember.View.extend({
	      template: Ember.Handlebars.compile("<p class='empty'>There are no entries. Use the Add Entry button above.</p>")
    })
});

App.Button = Em.Button.extend({
    // Simple marker for consistency with the App.ViewName convention. jQuery Mobile automatically styles buttons.
});

// Model
App.Entry = Ember.Object.extend({
  // these will be supplied by `create`
  name: "Unknown Entry",
  amount: 0.00,
  category: "Charity",
  date: new Date(),
  isDate: function(){
	 return this.category === "Date";
  }.property("category"),
  isIncome: function(){
	 return this.category === "Income";
  }.property("category"),
  isDeductable: function(){
	 return this.category === "Deductable";
  }.property("category"),
  isCharity: function(){
	 return this.category === "Charity";
  }.property("category"),
  dateString: function(){
	 return this.date.toString("MMMM dd, yyyy h:mm tt");
  }.property("date")
});

// Controller
App.entriesController = Em.ArrayProxy.create({
  content: Ember.A([]),

  createEntry: function(name, amount, category, date) {
    this.addEntry(name, amount, category, date);
	localStorage.entries = (JSON.stringify(this.content));
  },

  addEntry: function(name, amount, category, date) {
    var entry = App.Entry.create({ name: name, amount: parseNumber(amount), category : category, date: parseDate(date) });
    this.pushObject(entry);
  },

  owed: function() {
	
	var filteredArray = this.content.slice(0);
	if(this.filterLevel === "month"){
		filteredArray = filteredArray.filter(function(item, index, self) {
		  var currentMonth = new Date().getMonth();
		  if (item.get('date').getMonth() === currentMonth) { return true; }
		});
	}
	if(this.filterLevel === "year"){
		filteredArray = filteredArray.filter(function(item, index, self) {
		  var currentYear = new Date().getFullYear();
		  if (item.get('date').getFullYear() === currentYear) { return true; }
		});
	}
	
	var totalCharity = 0.00;
    filteredArray.filterProperty('category', "Charity").forEach(function(item){
		totalCharity += item.amount;
	});
	
	var totalIncome = 0.00;
    filteredArray.filterProperty('category', "Income").forEach(function(item){
		totalIncome += item.amount;
	});
	
	var totalDeducatbles = 0.00;
    filteredArray.filterProperty('category', "Deductable").forEach(function(item){
		totalDeducatbles += item.amount;
	});
	
	return numberWithCommas((((totalIncome - totalDeducatbles) * 0.10) - totalCharity).toFixed(2));
  }.property('@each.category', '@each.amount', 'filterLevel'),

	compare : function(a, b){
		var aDate = a.get('date');
		var bDate = b.get('date');
		return aDate.compareTo(bDate);
	},
	
  	entries: function(){
		var filteredArray = App.entriesController.content.slice(0);
		if(this.filterLevel === "month"){
			filteredArray = filteredArray.filter(function(item, index, self) {
			  var currentMonth = new Date().getMonth();
			  if (item.get('date').getMonth() === currentMonth) { return true; }
			});
		}
		if(this.filterLevel === "year"){
			filteredArray = filteredArray.filter(function(item, index, self) {
			  var currentYear = new Date().getFullYear();
			  if (item.get('date').getFullYear() === currentYear) { return true; }
			});
		}
		var sortedArray =  filteredArray.sort(this.compare).slice(0);
		if(sortedArray.length > 0 && sortedArray[0].get("category") !== "Date"){
			var firstDate = new Date();
			firstDate.setTime(sortedArray[0].get('date').getTime());
			firstDate.setHours(0);
			firstDate.setMinutes(0);
			firstDate.setSeconds(0);
			firstDate.setMilliseconds(0);
			sortedArray.splice(0, 0, App.Entry.create({ name: formatDate(firstDate), date: firstDate, category : "Date"}));
		}
		
		for(var index = 0; index < sortedArray.length; index++){
			var item = sortedArray[index];
			if(index > 0){
				var previousEntry = sortedArray[index - 1];
				var previousDate = previousEntry.get('date');
				var currentDate = item.get('date');
				if(previousEntry.get('category') !== 'Date' && (previousDate.getDate() !== currentDate.getDate() || previousDate.getMonth() !== currentDate.getMonth() || previousDate.getFullYear() !== currentDate.getFullYear())){
					sortedArray.splice(index,0,App.Entry.create({ name: formatDate(currentDate), date: currentDate, category : "Date" }));
				}
			}
		}
		return sortedArray;
	}.property('@each', '@each.date', '@each.name', '@each.category', '@each.amount', 'filterLevel'),
	
	deleteEntry: function(entry){
		var index = this.indexOf(entry);
		this.removeAt(index);
		localStorage.entries = (JSON.stringify(this.content));
	},
	
	filterLevel: "all"
});


App.MainHeaderView = App.HeaderView.extend({
	filter: function(event){
		App.entriesController.set('filterLevel',event.target.value);
	}
});

App.MainView = App.PageView.extend({
    templateName:'main',
    id: 'main-view',
	elementId : 'main',
    didInsertElement: function() {
        $.mobile.changePage("#" + this.elementId);
		if(!localStorage.seenUserBefore){
			$("#aboutTrigger").click();
			localStorage.seenUserBefore = true;
		}
    }
});

var addEntryDialogDateWidgetApplied = false;
App.AddEntryDialogView = App.PageView.extend({
    templateName:'add',
    id: 'add-view',
	elementId : 'add',
    didInsertElement: function() {
        //$.mobile.changePage(this.$());
		if(!addEntryDialogDateWidgetApplied){
			$(function(){
			    $('#date').scroller({
			        preset: 'date',
			        theme: 'jqm',
			        display: 'inline',
			        mode: 'mixed'
			    });
			});
		}
		addEntryDialogDateWidgetApplied = true;
    },
	edit : function(event){
		App.entriesController.createEntry($("#name").val(), $("#amount").val(), $("#category").val(), $("#date").val());
		$.mobile.changePage("#main");
	}
});

App.EditEntryDialogView = App.PageView.extend({
    templateName:'edit',
    id: 'edit-view',
    didInsertElement: function(element, elementId) {
		var datefield = this.$(".datefield")
	    datefield.scroller({
	        preset: 'date',
	        theme: 'jqm',
	        display: 'inline',
	        mode: 'mixed'
	    });
	    datefield.scroller("setDate", this.content.get('date'), true)
		editEntryDialogDateWidgetApplied = true;
		$.mobile.changePage(this.$(), {transition: 'pop', role: 'dialog'});
    },
	content : {},
	edit: function(event) {
		var dialog = $(event.currentTarget).parent(".editbox");
		var editedObject = this.content;
		editedObject.set("name", $(".name",dialog).val());
		editedObject.set("amount", parseNumber($(".amount",dialog).val()));
		editedObject.set("category", $(".category",dialog).val());
		editedObject.set("date", parseDate($(".date",dialog).val()));
		$.mobile.changePage("#main");
		localStorage.entries = (JSON.stringify(App.entriesController.content));
    }
});

App.AboutDialogView = App.PageView.extend({
    templateName:'about',
    id: 'about-view',
	elementId : 'about'
});

var timesRun = 0;

$(document).bind('pagebeforecreate', function(){
	console.log("pagebeforecreate");
	
	var aboutView = App.get('aboutView');

    if (!aboutView) {
        aboutView = App.AboutDialogView.create();
        App.set('aboutView',aboutView);
        aboutView.append();
    }
	
	var addView = App.get('addView');

    if (!addView) {
        addView = App.AddEntryDialogView.create();
        App.set('addView',addView);
        addView.append();
    }

    var mainView = App.get('mainView');

    if (!mainView) {
        mainView = App.MainView.create();
        App.set('mainView',mainView);
        mainView.append();
    }

	timesRun += 1;
	if(timesRun === 2 && localStorage.entries){
		oldData = JSON.parse(localStorage.entries);
		oldData.forEach(function(value, index, array){
			App.entriesController.addEntry(value.name, value.amount, value.category, parseDate(value.date));
		});
	}

});

$(document).ready(function(){
		
});