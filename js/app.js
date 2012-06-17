var App = Em.Application.create();

App.Entry = Ember.Object.extend({
  // these will be supplied by `create`
  name: "Unknown Entry",
  amount: 0.00,
  category: "Charity",
  date: new Date()
});

App.entriesController = Em.ArrayProxy.create({
  content: Ember.A([]),

  createCharity: function(name, amount) {
    var charity = App.Entry.create({ name: name, amount: amount, category : "Charity" });
    this.pushObject(charity);
  },

  createIncome: function(name, amount) {
    var income = App.Entry.create({ name: name, amount: amount, category: "Income" });
    this.pushObject(income);
  },

  createDeductable: function(name, amount) {
    var deductable = App.Entry.create({ name: name, amount: amount, category: "Deductable" });
    this.pushObject(deductable);
  },

  owed: function() {
	var totalCharity = 0.00;
    this.filterProperty('category', "Charity").forEach(function(item){
		totalCharity += item.amount;
	});
	
	var totalIncome = 0.00;
    this.filterProperty('category', "Income").forEach(function(item){
		totalIncome += item.amount;
	});
	
	var totalDeducatbles = 0.00;
    this.filterProperty('category', "Deductable").forEach(function(item){
		totalDeducatbles += item.amount;
	});
	
	return ((totalIncome - totalDeducatbles) * 0.10) - totalCharity;
  }.property('@each.category', '@each.amount')
});

App.EntryList = Em.View.extend({
  compare : function(a, b){
		if(a.get('date') > b.get('date')){
			return -1;
		}
		if(a.get('date') < b.get('date')){
			return 1;
		}
		return 0;
	},
  entriesBinding: App.entriesController.content.sort(this.compare)
});

