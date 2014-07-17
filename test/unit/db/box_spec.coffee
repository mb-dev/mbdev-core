describe 'Box', ->
  it 'should allow setting values', ->
    item = {name: 'Groceries'}
    box = new Box()
    box.addRow(item)
    box.setColumns([0..11], ['expense', 'future_expense', 'planned_expense'])
    box.addToValue(item, 0, 'expense', 100)
    box.addToValue(item, 1, 'expense', 100)

    firstColumnValue = box.rowColumnValues(item)[0]
    expect(firstColumnValue.column).toEqual('0')
    expect(firstColumnValue.values.expense.toFixed(0)).toEqual('100')

    totals = box.rowTotals(item)
    expect(totals['expense'].toFixed(0)).toEqual('200')