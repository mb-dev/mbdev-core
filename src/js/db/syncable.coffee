class Syncable
  getAvailableId: =>
    currentTime = moment().unix()
    if @lastIssuedId >= currentTime
      @lastIssuedId = @lastIssuedId + 1
    else
      @lastIssuedId = currentTime

  reset: =>
    @lastIssuedId = 0
    @updatedAt = 0
    @actionsLog = []

  onInsert: (details) =>
    @actionsLog.push({action: 'insert', id: details.id, item: details})
    @onModified()

  onEdit: (details) =>
    @actionsLog.push({action: 'update', id: details.id, item: details})
    @onModified()

  onDelete: (itemId) =>
    @actionsLog.push({action: 'delete', id: itemId})
    @onModified()

  onModified: =>
    @updatedAt = Date.now()