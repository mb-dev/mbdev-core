class window.Box
  constructor: ->
    @rows = []
    @rowByHash = {}
  
  addRow: (item) ->
    return if @rowByHash[item]
    row = {columns: {}, totals: {}}
    @rows.push row
    @rowByHash[item] = row
  
  setColumns: (columns, valueTypes) ->
    @rows.forEach (row) ->
      columns.forEach (colValue) ->
        column = row['columns'][colValue] = {}
        column['values'] = {}
        (valueTypes).forEach (type) ->
          column['values'][type] ?= new BigNumber(0)
      valueTypes.forEach (type) ->
        row['totals'][type] = new BigNumber(0)
      

  setValues: (row, col, type, value) ->

  addToValue: (row, col, type, value) ->
    return if !row
    if !@rowByHash[row]
      console.log("missing item", row)
      return
    column = @rowByHash[row]['columns'][col]
    column['values'][type] = column['values'][type].plus(value)
    @rowByHash[row]['totals'][type] = @rowByHash[row]['totals'][type].plus(value)
  
  columnAmount: ->
    @rows[0]['values'].length
  
  rowColumnValues: (row) =>
    return [] if !@rowByHash[row]
    _(@rowByHash[row]['columns']).pairs().map((item) -> {column: item[0], values: item[1].values }).toArray()

  rowTotals: (row) =>
    if(!@rowByHash[row])
      return {amount: new BigNumber(0)}
    @rowByHash[row]['totals']
  
  # private
  columnValues = (column) ->
    return 0 if column.blank?
    column['values'] || 0