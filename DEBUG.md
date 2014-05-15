Debug commands:
###
weird functions to fix issues:
convertId = function(id) { return parseInt(id[0], 10) + id.length - 1 }
events:
angular.element('.list-group').injector().get('mdb').events().collection.forEach(function(item, index) { if(item.participantIds && item.participantIds[0]) { console.log(item.participantIds[0], convertId(item.participantIds[0])); } })
angular.element('.list-group').injector().get('mdb').events().collection.forEach(function(item, index) { item.participants && item.participants.forEach(function(item, index) {item.participants[index] = parseInt(item.participants[index], 10) }) })
angular.element('.list-group').injector().get('mdb').events().collection.forEach(function(item, index) { item.associatedMemories && item.associatedMemories.forEach(function(item, index) {item.associatedMemories[index] = parseInt(item.associatedMemories[index], 10) }) })
--
events:
angular.element('ng-view').injector().get('mdb').events().collection.forEach(function(item, index) { 
  if(item.participantIds) { 
   item.participantIds.forEach(function(association, index) {
     item.participantIds[index] = parseInt(item.participantIds[index], 10); 
   }) 
  }
  if(item.associatedMemories) {
    item.associatedMemories.forEach(function(association, index) {
     item.associatedMemories[index] = parseInt(item.associatedMemories[index], 10); 
   })  
  }
}) 
angular.element('ng-view').injector().get('mdb').saveTables(['events'], true)
---
memories:
angular.element('ng-view').injector().get('mdb').memories().collection.forEach(function(item, index) { 
 if(item.events) { 
   item.events.forEach(function(association, index) {
     item.events[index] = parseInt(item.events[index], 10); 
   }) 
 }
 if(item.people) { 
   item.people.forEach(function(association, index) {
     item.people[index] = parseInt(item.people[index], 10); 
   }) 
 }
 if(item.parentMemoryId) {
    item.parentMemoryId = parseInt(item.parentMemoryId, 10);
 }
}) 
angular.element('ng-view').injector().get('mdb').saveTables(['memories'], true)
--
line items:
angular.element('.list-group').injector().get('fdb').lineItems().collection.forEach(function(item, index) { 
   item.accountId = parseInt(item.accountId, 10);
   item.importId = parseInt(item.importId, 10);
})
angular.element('body').injector().get('fdb').saveTables(['lineItems'], true) 
--
processing rules:
angular.element('ng-view').injector().get('fdb').processingRules().collection.forEach(function(item, index) { 
   item.id = index + 1;
   angular.element('ng-view').injector().get('fdb').processingRules().actualCollection[item.key].id = index + 1;
})
###