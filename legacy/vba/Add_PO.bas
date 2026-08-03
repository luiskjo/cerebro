Attribute VB_Name = "modAddPO"
'==============================================================================
' modAddPO - Import a PO or CO into the "Material Management" log
'------------------------------------------------------------------------------
' Rewrite of the original Add_PO macro. Same end result, but:
'   * Excel is never left frozen (screen updating / events / calculation are
'     restored on EVERY exit path, including Cancel and runtime errors).
'   * No user form or MsgBox is ever shown while the screen is frozen.
'   * Per-cell clipboard formatting (thousands of Copy/PasteSpecial round trips)
'     is replaced by a handful of block operations.
'   * Rows are inserted once as a block instead of one at a time.
'   * Row bookkeeping stays correct after inserts (the old version wrote
'     quantities into shifted rows and reused the same item code repeatedly).
'
' See README.md next to this file for the full list of issues fixed and for the
' one-line change required in the two user forms.
'==============================================================================
Option Explicit

'--- Configuration -----------------------------------------------------------
Private Const DEST_SHEET      As String = "Material Management"
Private Const SHEET_PASSWORD  As String = "colt1224"

Private Const TEMPLATE_ROW    As Long = 6      ' hidden template row
Private Const TEMPLATE_COL    As Long = 11     ' hidden template column (K)
Private Const FIRST_DATA_ROW  As Long = 7
Private Const FIRST_QTY_COL   As Long = 12     ' column L
Private Const DESC_COL        As Long = 2      ' column B - material description
Private Const CODE_COL        As Long = 1      ' column A - group/item code
Private Const NOTES_COL       As Long = 10     ' column J - formatted from J6
Private Const MAX_QTY_COLS    As Long = 500    ' safety bound on the PO/CO columns

' Source workbook layout (1-based column numbers)
Private Const CO_DESC_COL     As Long = 11
Private Const CO_QTY_COL      As Long = 18
Private Const PO_DESC_COL     As Long = 14
Private Const PO_QTY_COL      As Long = 4

'--- Types -------------------------------------------------------------------
Private Type POHeaderT
    PoName  As String
    Vendor  As String
    PoDate  As Variant
End Type

Private Type AppStateT
    Saved         As Boolean
    ScreenUpdating As Boolean
    EnableEvents  As Boolean
    DisplayAlerts As Boolean
    Calculation   As XlCalculation
    Cursor        As XlMousePointer
End Type

Private mState As AppStateT


'==============================================================================
' Entry point
'==============================================================================
Public Sub Add_PO()

    Dim isCO        As Boolean
    Dim srcPath     As Variant
    Dim hdr         As POHeaderT
    Dim names()     As String
    Dim qtys()      As Double
    Dim itemCount   As Long
    Dim groupKey    As String
    Dim wsDest      As Worksheet
    Dim wasProtected As Boolean
    Dim addedRows   As Long

    On Error GoTo CleanFail

    ' --- 1. What are we importing? (asked before anything is frozen) ---------
    If Not AskPOType(isCO) Then Exit Sub

    ' --- 2. Pick the source file --------------------------------------------
    srcPath = Application.GetOpenFilename( _
                  "Excel Files (*.xls*), *.xls*", , _
                  "Select " & IIf(isCO, "CO", "PO") & " Excel File")
    If VarType(srcPath) = vbBoolean Then Exit Sub          ' user cancelled

    ' --- 3. Read the source workbook ----------------------------------------
    FreezeApp
    Application.StatusBar = "Reading " & IIf(isCO, "CO", "PO") & " file..."
    ReadSourceMaterials CStr(srcPath), isCO, hdr, names, qtys, itemCount
    ThawApp                                                 ' UI back on

    If itemCount = 0 Then
        MsgBox "No valid materials were found in that file." & vbCrLf & vbCrLf & _
               "Expected descriptions in column " & _
               ColLetter(IIf(isCO, CO_DESC_COL, PO_DESC_COL)) & " and quantities in column " & _
               ColLetter(IIf(isCO, CO_QTY_COL, PO_QTY_COL)) & ".", vbExclamation, "Add PO/CO"
        Exit Sub
    End If

    ' --- 4. Which material group? -------------------------------------------
    If Not AskMaterialType(groupKey) Then Exit Sub

    ' --- 5. Write into the log ----------------------------------------------
    Set wsDest = ThisWorkbook.Worksheets(DEST_SHEET)
    wsDest.Visible = xlSheetVisible

    FreezeApp
    Application.StatusBar = "Importing " & itemCount & " materials..."

    wasProtected = wsDest.ProtectContents
    If wasProtected Then wsDest.Unprotect Password:=SHEET_PASSWORD

    wsDest.Rows(TEMPLATE_ROW).Hidden = False
    wsDest.Columns(TEMPLATE_COL).Hidden = False

    WriteImport wsDest, isCO, hdr, groupKey, names, qtys, itemCount, addedRows

    wsDest.Rows(TEMPLATE_ROW).Hidden = True
    wsDest.Columns(TEMPLATE_COL).Hidden = True

    RefreshVendorDropdownSafe wsDest

    wsDest.Protect Password:=SHEET_PASSWORD, AllowFiltering:=True
    ThawApp

    MsgBox IIf(isCO, "CO ", "PO ") & hdr.PoName & " added." & vbCrLf & vbCrLf & _
           itemCount & " material line(s) imported." & vbCrLf & _
           addedRows & " new row(s) created.", vbInformation, "Add PO/CO"
    Exit Sub

CleanFail:
    Dim errNum As Long, errDesc As String
    errNum = Err.Number: errDesc = Err.Description

    On Error Resume Next
    If Not wsDest Is Nothing Then
        wsDest.Rows(TEMPLATE_ROW).Hidden = True
        wsDest.Columns(TEMPLATE_COL).Hidden = True
        If wasProtected And Not wsDest.ProtectContents Then
            wsDest.Protect Password:=SHEET_PASSWORD, AllowFiltering:=True
        End If
    End If
    ThawApp
    On Error GoTo 0

    MsgBox "The import could not be completed." & vbCrLf & vbCrLf & _
           "Error " & errNum & ": " & errDesc, vbCritical, "Add PO/CO"
End Sub


'==============================================================================
' Application state - the single reason the old version could "lock" Excel
'==============================================================================
Private Sub FreezeApp()
    If Not mState.Saved Then
        mState.ScreenUpdating = Application.ScreenUpdating
        mState.EnableEvents = Application.EnableEvents
        mState.DisplayAlerts = Application.DisplayAlerts
        mState.Calculation = Application.Calculation
        mState.Cursor = Application.Cursor
        mState.Saved = True
    End If
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    Application.DisplayAlerts = False
    Application.Calculation = xlCalculationManual
    Application.Cursor = xlWait
End Sub

Private Sub ThawApp()
    On Error Resume Next
    If mState.Saved Then
        Application.Calculation = mState.Calculation
        Application.DisplayAlerts = mState.DisplayAlerts
        Application.EnableEvents = mState.EnableEvents
        Application.ScreenUpdating = mState.ScreenUpdating
        Application.Cursor = mState.Cursor
        mState.Saved = False
    Else
        Application.Calculation = xlCalculationAutomatic
        Application.DisplayAlerts = True
        Application.EnableEvents = True
        Application.ScreenUpdating = True
        Application.Cursor = xlDefault
    End If
    Application.CutCopyMode = False
    Application.StatusBar = False
    On Error GoTo 0
End Sub

' Emergency hatch: run this from the VBA window (or assign it to a button) if
' Excel is ever left unresponsive by any macro in this workbook.
Public Sub Unfreeze_Excel()
    mState.Saved = False
    ThawApp
    MsgBox "Excel UI restored.", vbInformation
End Sub


'==============================================================================
' User forms
'==============================================================================
Private Function AskPOType(ByRef isCO As Boolean) As Boolean
    Dim f      As frmSelectPOType
    Dim choice As String

    Set f = New frmSelectPOType
    f.Show vbModal

    On Error Resume Next
    choice = UCase$(Trim$(f.SelectedOption))
    On Error GoTo 0

    Unload f
    Set f = Nothing

    If Len(choice) = 0 Then Exit Function        ' cancelled
    isCO = (choice = "CO")
    AskPOType = True
End Function

Private Function AskMaterialType(ByRef groupKey As String) As Boolean
    Dim f   As frmSelectMaterialType
    Dim tag As String

    Set f = New frmSelectMaterialType
    f.Show vbModal

    On Error Resume Next
    tag = Trim$(f.Tag)
    On Error GoTo 0

    Unload f
    Set f = Nothing

    If Len(tag) = 0 Then
        MsgBox "No material type selected - nothing was imported.", vbInformation, "Add PO/CO"
        Exit Function
    End If

    groupKey = tag
    AskMaterialType = True
End Function


'==============================================================================
' Read the PO / CO workbook
'==============================================================================
Private Sub ReadSourceMaterials(ByVal filePath As String, _
                                ByVal isCO As Boolean, _
                                ByRef hdr As POHeaderT, _
                                ByRef outNames() As String, _
                                ByRef outQty() As Double, _
                                ByRef outCount As Long)

    Dim wb       As Workbook
    Dim ws       As Worksheet
    Dim descCol  As Long, qtyCol As Long
    Dim lastRow  As Long, r As Long
    Dim vDesc    As Variant, vQty As Variant
    Dim sums     As Object
    Dim order    As Collection
    Dim key      As String
    Dim q        As Double
    Dim looseCount As Long
    Dim i        As Long

    outCount = 0

    Set wb = Workbooks.Open(Filename:=filePath, UpdateLinks:=0, ReadOnly:=True, AddToMru:=False)
    On Error GoTo CloseAndRaise

    Set ws = wb.Worksheets(1)

    If isCO Then
        descCol = CO_DESC_COL
        qtyCol = CO_QTY_COL
        hdr.PoName = AsText(MergedValue(ws, 11, 24))
        hdr.PoDate = MergedValue(ws, 12, 25)
        hdr.Vendor = AsText(MergedValue(ws, 11, 7))
    Else
        descCol = PO_DESC_COL
        qtyCol = PO_QTY_COL
        hdr.PoName = AsText(MergedValue(ws, 5, 28))
        hdr.Vendor = AsText(MergedValue(ws, 10, 28))
        hdr.PoDate = MergedValue(ws, 7, 28)
    End If

    lastRow = ws.Cells(ws.Rows.Count, descCol).End(xlUp).Row
    If lastRow < 1 Then lastRow = 1

    ' One bulk read instead of two COM calls per row.
    vDesc = ReadColumnValues(ws, descCol, lastRow)
    vQty = ReadColumnValues(ws, qtyCol, lastRow)

    Set sums = CreateObject("Scripting.Dictionary")
    sums.CompareMode = 1                       ' vbTextCompare
    Set order = New Collection

    ' Pass 1 - honour the original rule: description must live in a merged cell.
    For r = 1 To lastRow
        If IsCandidateRow(vDesc, vQty, r, key, q) Then
            If ws.Cells(r, descCol).MergeCells Then
                AccumulateItem sums, order, key, q
            Else
                looseCount = looseCount + 1
            End If
        End If
    Next r

    ' Pass 2 - only if the merge rule found nothing but plain rows do qualify.
    If sums.Count = 0 And looseCount > 0 Then
        Dim answer As VbMsgBoxResult
        ThawApp
        answer = MsgBox("No merged description cells were found, but " & looseCount & _
                        " row(s) look like valid material lines." & vbCrLf & vbCrLf & _
                        "Import them anyway?", vbQuestion + vbYesNo, "Add PO/CO")
        FreezeApp
        If answer = vbYes Then
            For r = 1 To lastRow
                If IsCandidateRow(vDesc, vQty, r, key, q) Then
                    AccumulateItem sums, order, key, q
                End If
            Next r
        End If
    End If

    wb.Close SaveChanges:=False
    Set wb = Nothing

    outCount = sums.Count
    If outCount = 0 Then Exit Sub

    ReDim outNames(1 To outCount)
    ReDim outQty(1 To outCount)
    For i = 1 To outCount
        outNames(i) = order(i)
        outQty(i) = sums(order(i))
    Next i
    Exit Sub

CloseAndRaise:
    Dim n As Long, d As String
    n = Err.Number: d = Err.Description
    On Error Resume Next
    If Not wb Is Nothing Then wb.Close SaveChanges:=False
    On Error GoTo 0
    Err.Raise n, "ReadSourceMaterials", d
End Sub

' True when row r carries a usable description + non-zero numeric quantity.
Private Function IsCandidateRow(ByRef vDesc As Variant, ByRef vQty As Variant, _
                                ByVal r As Long, ByRef key As String, ByRef q As Double) As Boolean
    key = Trim$(AsText(vDesc(r, 1)))
    If Len(key) = 0 Then Exit Function
    If UCase$(key) = "DESCRIPTION" Then Exit Function
    If InStr(1, key, "TAX", vbTextCompare) > 0 Then Exit Function
    If Not IsNumeric(vQty(r, 1)) Then Exit Function

    q = CDbl(vQty(r, 1))
    If q = 0 Then Exit Function

    IsCandidateRow = True
End Function

' Repeated line items for the same material are summed rather than overwritten.
Private Sub AccumulateItem(ByVal sums As Object, ByVal order As Collection, _
                           ByVal key As String, ByVal q As Double)
    If sums.Exists(key) Then
        sums(key) = sums(key) + q
    Else
        sums.Add key, q
        order.Add key
    End If
End Sub


'==============================================================================
' Write into "Material Management"
'==============================================================================
Private Sub WriteImport(ByVal wsDest As Worksheet, _
                        ByVal isCO As Boolean, _
                        ByRef hdr As POHeaderT, _
                        ByVal groupKey As String, _
                        ByRef names() As String, _
                        ByRef qtys() As Double, _
                        ByVal itemCount As Long, _
                        ByRef addedRows As Long)

    Dim destCol       As Long
    Dim lastDataRow   As Long
    Dim hdrColor      As Long
    Dim rowKind()     As Byte            ' 0 = blank, 1 = material, 2 = group header
    Dim matRow        As Object          ' material name  -> row
    Dim grpRow        As Object          ' group name     -> row
    Dim grpNum        As Object          ' group name     -> numeric code
    Dim grpMaxIdx     As Object          ' numeric code   -> highest child index
    Dim maxGroupCode  As Long
    Dim groupExists   As Boolean
    Dim groupNumber   As Long
    Dim insertAt      As Long, blockEnd As Long
    Dim newNames()    As String, newQty() As Double, newCount As Long
    Dim hitRows()     As Long, hitQty() As Double, hitCount As Long
    Dim newRowCount   As Long
    Dim childStart    As Long
    Dim i             As Long, r As Long, ptr As Long

    hdrColor = wsDest.Cells(1, 1).Interior.Color

    '--- Locate / create the PO-CO column ------------------------------------
    destCol = FIRST_QTY_COL
    Do While Len(AsText(wsDest.Cells(2, destCol).Value2)) > 0
        destCol = destCol + 1
        If destCol > FIRST_QTY_COL + MAX_QTY_COLS Then
            Err.Raise vbObjectError + 513, "WriteImport", _
                      "More than " & MAX_QTY_COLS & " PO/CO columns found - row 2 of " & _
                      DEST_SHEET & " may contain stray data."
        End If
    Loop

    wsDest.Cells(2, destCol).Value = IIf(isCO, "CO", "PO")
    wsDest.Cells(3, destCol).Value = hdr.Vendor
    wsDest.Cells(4, destCol).Value = hdr.PoDate
    wsDest.Cells(5, destCol).Value = hdr.PoName

    wsDest.Columns(TEMPLATE_COL).Copy
    wsDest.Columns(destCol).PasteSpecial Paste:=xlPasteFormats
    Application.CutCopyMode = False
    wsDest.Columns(destCol).ColumnWidth = 15

    '--- Map what is already on the sheet ------------------------------------
    Set matRow = CreateObject("Scripting.Dictionary"): matRow.CompareMode = 1
    Set grpRow = CreateObject("Scripting.Dictionary"): grpRow.CompareMode = 1
    Set grpNum = CreateObject("Scripting.Dictionary"): grpNum.CompareMode = 1
    Set grpMaxIdx = CreateObject("Scripting.Dictionary")

    lastDataRow = wsDest.Cells(wsDest.Rows.Count, DESC_COL).End(xlUp).Row
    If lastDataRow < FIRST_DATA_ROW Then lastDataRow = FIRST_DATA_ROW - 1

    ScanExistingRows wsDest, lastDataRow, rowKind, matRow, grpRow, grpNum, grpMaxIdx, maxGroupCode

    groupExists = grpRow.Exists(groupKey)
    If groupExists Then groupNumber = CLng(grpNum(groupKey))
    ' New group, or an existing header row that never had a code of its own.
    If groupNumber < 1 Then groupNumber = maxGroupCode + 1
    If Not grpMaxIdx.Exists(groupNumber) Then grpMaxIdx(groupNumber) = 0

    '--- Split the import into "update existing row" vs "new row" -------------
    ReDim newNames(1 To itemCount)
    ReDim newQty(1 To itemCount)
    ReDim hitRows(1 To itemCount)
    ReDim hitQty(1 To itemCount)

    For i = 1 To itemCount
        If matRow.Exists(names(i)) Then
            hitCount = hitCount + 1
            hitRows(hitCount) = matRow(names(i))
            hitQty(hitCount) = qtys(i)
        Else
            newCount = newCount + 1
            newNames(newCount) = names(i)
            newQty(newCount) = qtys(i)
        End If
    Next i

    '--- Insert every new row in ONE operation -------------------------------
    If newCount > 0 Then
        If groupExists Then
            insertAt = grpRow(groupKey) + 1
            Do While insertAt <= lastDataRow
                If rowKind(insertAt) = 1 Then insertAt = insertAt + 1 Else Exit Do
            Loop
        Else
            insertAt = lastDataRow + 1
            If insertAt < FIRST_DATA_ROW Then insertAt = FIRST_DATA_ROW
        End If

        newRowCount = newCount
        If Not groupExists Then newRowCount = newRowCount + 1   ' + the group header row
        blockEnd = insertAt + newRowCount - 1

        wsDest.Rows(insertAt & ":" & blockEnd).Insert _
               Shift:=xlDown, CopyOrigin:=xlFormatFromLeftOrAbove

        ' Rows below the insert point moved down - keep our bookkeeping honest.
        For i = 1 To hitCount
            If hitRows(i) >= insertAt Then hitRows(i) = hitRows(i) + newRowCount
        Next i
        lastDataRow = lastDataRow + newRowCount
        addedRows = newRowCount

        ' Formats + formulas for the whole block: 2 clipboard operations total.
        wsDest.Range(wsDest.Cells(TEMPLATE_ROW, 2), wsDest.Cells(TEMPLATE_ROW, 9)).Copy
        wsDest.Range(wsDest.Cells(insertAt, 2), wsDest.Cells(blockEnd, 9)).PasteSpecial Paste:=xlPasteFormats
        wsDest.Range(wsDest.Cells(TEMPLATE_ROW, 4), wsDest.Cells(TEMPLATE_ROW, 9)).Copy
        wsDest.Range(wsDest.Cells(insertAt, 4), wsDest.Cells(blockEnd, 9)).PasteSpecial Paste:=xlPasteFormulas
        Application.CutCopyMode = False

        ' Codes, descriptions and quantities written as arrays.
        Dim outAB() As Variant, outQ() As Variant
        ReDim outAB(1 To newRowCount, 1 To 2)
        ReDim outQ(1 To newRowCount, 1 To 1)

        ptr = 1
        If Not groupExists Then
            outAB(1, 1) = groupNumber & ".0"
            outAB(1, 2) = groupKey
            outQ(1, 1) = Empty
            ptr = 2
        End If

        childStart = CLng(grpMaxIdx(groupNumber)) + 1
        For i = 1 To newCount
            outAB(ptr, 1) = groupNumber & "." & (childStart + i - 1)
            outAB(ptr, 2) = newNames(i)
            outQ(ptr, 1) = newQty(i)
            ptr = ptr + 1
        Next i
        grpMaxIdx(groupNumber) = childStart + newCount - 1

        wsDest.Range(wsDest.Cells(insertAt, CODE_COL), wsDest.Cells(blockEnd, DESC_COL)).Value = outAB
        wsDest.Range(wsDest.Cells(insertAt, destCol), wsDest.Cells(blockEnd, destCol)).Value = outQ

        ' Item codes stay invisible (font matches the header fill), as before.
        wsDest.Range(wsDest.Cells(insertAt, CODE_COL), wsDest.Cells(blockEnd, CODE_COL)).Font.Color = hdrColor

        If Not groupExists Then
            wsDest.Range(wsDest.Cells(insertAt, CODE_COL), wsDest.Cells(insertAt, destCol)).Interior.Color = hdrColor
            With wsDest.Cells(insertAt, DESC_COL).Font
                .Bold = True
                .Color = vbWhite
            End With
        End If
    End If

    '--- Quantities for materials that already had a row ---------------------
    For i = 1 To hitCount
        wsDest.Cells(hitRows(i), destCol).Value = hitQty(i)
    Next i

    '--- Re-apply the standard look to every material row --------------------
    lastDataRow = wsDest.Cells(wsDest.Rows.Count, DESC_COL).End(xlUp).Row
    FormatMaterialRows wsDest, lastDataRow, destCol, hdrColor
    FormatBoundary wsDest, lastDataRow, destCol, hdrColor
End Sub


' Classify rows 7..lastDataRow and collect group / material positions.
Private Sub ScanExistingRows(ByVal wsDest As Worksheet, _
                             ByVal lastDataRow As Long, _
                             ByRef rowKind() As Byte, _
                             ByVal matRow As Object, _
                             ByVal grpRow As Object, _
                             ByVal grpNum As Object, _
                             ByVal grpMaxIdx As Object, _
                             ByRef maxGroupCode As Long)

    Dim vCode As Variant, vName As Variant
    Dim r As Long, idx As Long
    Dim code As String, nm As String
    Dim isGroup As Boolean
    Dim parts() As String
    Dim gNum As Long, cIdx As Long

    ReDim rowKind(FIRST_DATA_ROW To IIf(lastDataRow < FIRST_DATA_ROW, FIRST_DATA_ROW, lastDataRow))
    maxGroupCode = 0
    If lastDataRow < FIRST_DATA_ROW Then Exit Sub

    vCode = ReadBlockValues(wsDest, FIRST_DATA_ROW, CODE_COL, lastDataRow, CODE_COL)
    vName = ReadBlockValues(wsDest, FIRST_DATA_ROW, DESC_COL, lastDataRow, DESC_COL)

    For r = FIRST_DATA_ROW To lastDataRow
        idx = r - FIRST_DATA_ROW + 1
        code = Trim$(AsText(vCode(idx, 1)))
        nm = Trim$(AsText(vName(idx, 1)))

        If Len(nm) = 0 Then
            rowKind(r) = 0
        Else
            isGroup = False
            gNum = 0: cIdx = 0
            parts = Split(code, ".")

            If UBound(parts) = 1 Then
                If IsNumeric(parts(0)) And IsNumeric(parts(1)) Then
                    gNum = CLng(Val(parts(0)))
                    cIdx = CLng(Val(parts(1)))
                    isGroup = (cIdx = 0)
                Else
                    ' Unrecognised code - fall back to the old bold-font test.
                    isGroup = (wsDest.Cells(r, DESC_COL).Font.Bold = True)
                End If
            Else
                ' No code on the row - fall back to the old bold-font test.
                isGroup = (wsDest.Cells(r, DESC_COL).Font.Bold = True)
            End If

            If gNum > maxGroupCode Then maxGroupCode = gNum

            If isGroup Then
                rowKind(r) = 2
                grpRow(nm) = r
                grpNum(nm) = gNum
                If Not grpMaxIdx.Exists(gNum) Then grpMaxIdx(gNum) = 0
            Else
                rowKind(r) = 1
                matRow(nm) = r
                If gNum > 0 Then
                    If Not grpMaxIdx.Exists(gNum) Then grpMaxIdx(gNum) = 0
                    If cIdx > CLng(grpMaxIdx(gNum)) Then grpMaxIdx(gNum) = cIdx
                End If
            End If
        End If
    Next r
End Sub


' Copies J6 and K6 formatting over the material rows in contiguous runs.
' The original did this one cell at a time - typically 5,000-20,000 clipboard
' round trips per import, which is what made Excel appear to hang.
Private Sub FormatMaterialRows(ByVal wsDest As Worksheet, _
                               ByVal lastDataRow As Long, _
                               ByVal destCol As Long, _
                               ByVal hdrColor As Long)

    Dim vCode As Variant, vName As Variant
    Dim r As Long, idx As Long
    Dim runStart As Long
    Dim isMaterial As Boolean
    Dim code As String, nm As String

    If lastDataRow < FIRST_DATA_ROW Then Exit Sub

    vCode = ReadBlockValues(wsDest, FIRST_DATA_ROW, CODE_COL, lastDataRow, CODE_COL)
    vName = ReadBlockValues(wsDest, FIRST_DATA_ROW, DESC_COL, lastDataRow, DESC_COL)

    runStart = 0
    For r = FIRST_DATA_ROW To lastDataRow + 1
        isMaterial = False
        If r <= lastDataRow Then
            idx = r - FIRST_DATA_ROW + 1
            code = Trim$(AsText(vCode(idx, 1)))
            nm = Trim$(AsText(vName(idx, 1)))
            If Len(nm) > 0 Then
                If Len(code) > 2 And Right$(code, 2) = ".0" Then
                    isMaterial = False
                ElseIf InStr(code, ".") > 0 Then
                    isMaterial = True
                Else
                    isMaterial = Not (wsDest.Cells(r, DESC_COL).Font.Bold = True)
                End If
            End If
        End If

        If isMaterial Then
            If runStart = 0 Then runStart = r
        ElseIf runStart > 0 Then
            ApplyTemplateFormats wsDest, runStart, r - 1, destCol
            runStart = 0
        End If
    Next r

    Application.CutCopyMode = False
End Sub

Private Sub ApplyTemplateFormats(ByVal wsDest As Worksheet, _
                                 ByVal firstRow As Long, ByVal lastRow As Long, _
                                 ByVal destCol As Long)
    wsDest.Cells(TEMPLATE_ROW, NOTES_COL).Copy
    wsDest.Range(wsDest.Cells(firstRow, NOTES_COL), _
                 wsDest.Cells(lastRow, NOTES_COL)).PasteSpecial Paste:=xlPasteFormats

    wsDest.Cells(TEMPLATE_ROW, TEMPLATE_COL).Copy
    wsDest.Range(wsDest.Cells(firstRow, FIRST_QTY_COL), _
                 wsDest.Cells(lastRow, destCol)).PasteSpecial Paste:=xlPasteFormats
    Application.CutCopyMode = False
End Sub

Private Sub FormatBoundary(ByVal wsDest As Worksheet, _
                           ByVal lastDataRow As Long, _
                           ByVal destCol As Long, _
                           ByVal hdrColor As Long)
    Dim boundaryCol As Long
    boundaryCol = destCol + 1
    If boundaryCol > wsDest.Columns.Count Then Exit Sub

    wsDest.Range(wsDest.Cells(1, boundaryCol), _
                 wsDest.Cells(lastDataRow + 1, boundaryCol)).Interior.Color = hdrColor
    wsDest.Range(wsDest.Cells(lastDataRow + 1, FIRST_QTY_COL), _
                 wsDest.Cells(lastDataRow + 1, destCol)).Interior.Color = hdrColor
    wsDest.Columns(boundaryCol).ColumnWidth = 1
End Sub


'==============================================================================
' Small helpers
'==============================================================================
Private Function ReadColumnValues(ByVal ws As Worksheet, ByVal col As Long, _
                                  ByVal lastRow As Long) As Variant
    ReadColumnValues = ReadBlockValues(ws, 1, col, lastRow, col)
End Function

' Always returns a 2-D array, even for a single cell.
Private Function ReadBlockValues(ByVal ws As Worksheet, _
                                 ByVal r1 As Long, ByVal c1 As Long, _
                                 ByVal r2 As Long, ByVal c2 As Long) As Variant
    Dim v As Variant
    Dim one(1 To 1, 1 To 1) As Variant

    If r2 < r1 Then r2 = r1
    v = ws.Range(ws.Cells(r1, c1), ws.Cells(r2, c2)).Value2
    If Not IsArray(v) Then
        one(1, 1) = v
        v = one
    End If
    ReadBlockValues = v
End Function

Private Function MergedValue(ByVal ws As Worksheet, ByVal r As Long, ByVal c As Long) As Variant
    Dim cel As Range
    Set cel = ws.Cells(r, c)
    If cel.MergeCells Then Set cel = cel.MergeArea.Cells(1, 1)
    MergedValue = cel.Value
End Function

Private Function AsText(ByVal v As Variant) As String
    If IsError(v) Then Exit Function
    If IsNull(v) Then Exit Function
    If IsEmpty(v) Then Exit Function
    AsText = CStr(v)
End Function

Private Function ColLetter(ByVal col As Long) As String
    Dim n As Long, rem_ As Long
    n = col
    Do While n > 0
        rem_ = (n - 1) Mod 26
        ColLetter = Chr$(65 + rem_) & ColLetter
        n = (n - 1) \ 26
    Loop
End Function

' The import itself is already committed by this point, so a failure inside the
' dropdown refresh must not roll the user back into the error handler.
Private Sub RefreshVendorDropdownSafe(ByVal wsDest As Worksheet)
    On Error Resume Next
    RefreshVendorDropdown wsDest
    On Error GoTo 0
End Sub
