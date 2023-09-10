/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import {
	InspectorControls,
	BlockControls,
	RichText,
	BlockIcon,
	AlignmentControl,
	useBlockProps,
	__experimentalUseColorProps as useColorProps,
	__experimentalUseBorderProps as useBorderProps,
	__experimentalGetElementClassName,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import {
	Button,
	PanelBody,
	Placeholder,
	TextControl,
	ToggleControl,
	ToolbarDropdownMenu,
	__experimentalHasSplitBorders as hasSplitBorders,
} from '@wordpress/components';
import {
	alignLeft,
	alignRight,
	alignCenter,
	blockTable as icon,
	tableColumnAfter,
	tableColumnBefore,
	tableColumnDelete,
	tableRowAfter,
	tableRowBefore,
	tableRowDelete,
	table,
} from '@wordpress/icons';
import { createBlock, getDefaultBlockName } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import {
	createTable,
	updateSelectedCell,
	getCellAttribute,
	insertRow,
	deleteRow,
	insertColumn,
	deleteColumn,
	toggleSection,
	isEmptyTableSection,
} from './state';

const ALIGNMENT_CONTROLS = [
	{
		icon: alignLeft,
		title: __( 'Align column left' ),
		align: 'left',
	},
	{
		icon: alignCenter,
		title: __( 'Align column center' ),
		align: 'center',
	},
	{
		icon: alignRight,
		title: __( 'Align column right' ),
		align: 'right',
	},
];

const cellAriaLabel = {
	head: __( 'Header cell text' ),
	body: __( 'Body cell text' ),
	foot: __( 'Footer cell text' ),
};

const placeholder = {
	head: __( 'Header label' ),
	foot: __( 'Footer label' ),
};

function TSection( { name, ...props } ) {
	const TagName = `t${ name }`;
	return <TagName { ...props } />;
}

function TableEdit( {
	attributes,
	setAttributes,
	insertBlocksAfter,
	isSelected,
} ) {
	const { hasFixedLayout, caption, head, foot } = attributes;
	const [ initialRowCount, setInitialRowCount ] = useState( 2 );
	const [ initialColumnCount, setInitialColumnCount ] = useState( 2 );
	const [ selectedCell, setSelectedCell ] = useState();
	const [ dragging, setDragging ] = useState( false );
	const [ startCell, setStartCell ] = useState( null );
	const [ endCell, setEndCell ] = useState( null );
	const [ mergedCells, setMergedCells ] = useState([]);

	const colorProps = useColorProps( attributes );
	const borderProps = useBorderProps( attributes );

	const tableRef = useRef();
	const [ hasTableCreated, setHasTableCreated ] = useState( false );

	/**
	 * Updates the initial column count used for table creation.
	 *
	 * @param {number} count New initial column count.
	 */
	function onChangeInitialColumnCount( count ) {
		setInitialColumnCount( count );
	}

	/**
	 * Updates the initial row count used for table creation.
	 *
	 * @param {number} count New initial row count.
	 */
	function onChangeInitialRowCount( count ) {
		setInitialRowCount( count );
	}

	/**
	 * Creates a table based on dimensions in local state.
	 *
	 * @param {Object} event Form submit event.
	 */
	function onCreateTable( event ) {
		event.preventDefault();

		setAttributes(
			createTable( {
				rowCount: parseInt( initialRowCount, 10 ) || 2,
				columnCount: parseInt( initialColumnCount, 10 ) || 2,
			} )
		);
		setHasTableCreated( true );
	}

	/**
	 * Toggles whether the table has a fixed layout or not.
	 */
	function onChangeFixedLayout() {
		setAttributes( { hasFixedLayout: ! hasFixedLayout } );
	}

	/**
	 * Changes the content of the currently selected cell.
	 *
	 * @param {Array} content A RichText content value.
	 */
	function onChange( content ) {
		if ( ! selectedCell ) {
			return;
		}

		setAttributes(
			updateSelectedCell(
				attributes,
				selectedCell,
				( cellAttributes ) => ( {
					...cellAttributes,
					content,
				} )
			)
		);
	}

	/**
	 * Align text within the a column.
	 *
	 * @param {string} align The new alignment to apply to the column.
	 */
	function onChangeColumnAlignment( align ) {
		if ( ! selectedCell ) {
			return;
		}

		// Convert the cell selection to a column selection so that alignment
		// is applied to the entire column.
		const columnSelection = {
			type: 'column',
			columnIndex: selectedCell.columnIndex,
		};

		const newAttributes = updateSelectedCell(
			attributes,
			columnSelection,
			( cellAttributes ) => ( {
				...cellAttributes,
				align,
			} )
		);
		setAttributes( newAttributes );
	}

	/**
	 * Get the alignment of the currently selected cell.
	 *
	 * @return {string | undefined} The new alignment to apply to the column.
	 */
	function getCellAlignment() {
		if ( ! selectedCell ) {
			return;
		}

		return getCellAttribute( attributes, selectedCell, 'align' );
	}

	/**
	 * Add or remove a `head` table section.
	 */
	function onToggleHeaderSection() {
		setAttributes( toggleSection( attributes, 'head' ) );
	}

	/**
	 * Add or remove a `foot` table section.
	 */
	function onToggleFooterSection() {
		setAttributes( toggleSection( attributes, 'foot' ) );
	}

	/**
	 * Inserts a row at the currently selected row index, plus `delta`.
	 *
	 * @param {number} delta Offset for selected row index at which to insert.
	 */
	function onInsertRow( delta ) {
		if ( ! selectedCell ) {
			return;
		}

		const { sectionName, rowIndex } = selectedCell;
		const newRowIndex = rowIndex + delta;

		setAttributes(
			insertRow( attributes, {
				sectionName,
				rowIndex: newRowIndex,
			} )
		);
		// Select the first cell of the new row.
		setSelectedCell( {
			sectionName,
			rowIndex: newRowIndex,
			columnIndex: 0,
			type: 'cell',
		} );
	}

	/**
	 * Inserts a row before the currently selected row.
	 */
	function onInsertRowBefore() {
		onInsertRow( 0 );
	}

	/**
	 * Inserts a row after the currently selected row.
	 */
	function onInsertRowAfter() {
		onInsertRow( 1 );
	}

	/**
	 * Deletes the currently selected row.
	 */
	function onDeleteRow() {
		if ( ! selectedCell ) {
			return;
		}

		const { sectionName, rowIndex } = selectedCell;

		setSelectedCell();
		setAttributes( deleteRow( attributes, { sectionName, rowIndex } ) );
	}

	/**
	 * Inserts a column at the currently selected column index, plus `delta`.
	 *
	 * @param {number} delta Offset for selected column index at which to insert.
	 */
	function onInsertColumn( delta = 0 ) {
		if ( ! selectedCell ) {
			return;
		}

		const { columnIndex } = selectedCell;
		const newColumnIndex = columnIndex + delta;

		setAttributes(
			insertColumn( attributes, {
				columnIndex: newColumnIndex,
			} )
		);
		// Select the first cell of the new column.
		setSelectedCell( {
			rowIndex: 0,
			columnIndex: newColumnIndex,
			type: 'cell',
		} );
	}

	/**
	 * Inserts a column before the currently selected column.
	 */
	function onInsertColumnBefore() {
		onInsertColumn( 0 );
	}

	/**
	 * Inserts a column after the currently selected column.
	 */
	function onInsertColumnAfter() {
		onInsertColumn( 1 );
	}

	/**
	 * Deletes the currently selected column.
	 */
	function onDeleteColumn() {
		if ( ! selectedCell ) {
			return;
		}

		const { sectionName, columnIndex } = selectedCell;

		setSelectedCell();
		setAttributes(
			deleteColumn( attributes, { sectionName, columnIndex } )
		);
	}

	function handleMouseDown( row, col ) {
		setDragging( true );
		setStartCell( { row, col });
		setEndCell( { row, col } );
	};

	function handleMouseOver( row, col ) {
		if ( dragging ) {
			setEndCell( { row, col } );
		}
	};

	function handleMouseUp() {
		setDragging( false );
	};

	function getCellMergeInfo( row, col ) {
		for ( const merge of mergedCells) {
			if ( row === merge.row && col === merge.col ) {
				return merge;
			}
		}

		return null;
	};

	function isInMergedCell( row, col ) {
		for ( const merge of mergedCells ) {
			if (
				row >= merge.row &&
				row < merge.row + merge.rowSpan &&
				col >= merge.col &&
				col < merge.col + merge.colSpan
			) {
				return true;
			}
		}
		return false;
	};

	function isInSelection( row, col ) {
		if ( ! startCell || ! endCell ) {
			return false;
		}

		const [ startRow, startCol ] = [ startCell.row, startCell.col ];
		const [ endRow, endCol ] = [ endCell.row, endCell.col ];

		return (
			row >= Math.min(startRow, endRow) &&
			row <= Math.max(startRow, endRow) &&
			col >= Math.min(startCol, endCol) &&
			col <= Math.max(startCol, endCol)
		);
	};

	function onMergeCells() {
		if ( startCell && endCell ) {
			const newMergedCell = {
				row: Math.min(startCell.row, endCell.row),
				col: Math.min(startCell.col, endCell.col),
				rowSpan: Math.abs(startCell.row - endCell.row) + 1,
				colSpan: Math.abs(startCell.col - endCell.col) + 1,
			};
			setMergedCells([...mergedCells, newMergedCell]);
			setStartCell(null);
			setEndCell(null);

			const topRow = Math.min(startCell.row, endCell.row);
			const leftCol = Math.min(startCell.col, endCell.col);
			const rowSpan = Math.abs(startCell.row - endCell.row) + 1;
			const colSpan = Math.abs(startCell.col - endCell.col) + 1;

			const newBody = [...attributes.body];

			// Set rowspan and colspan for the top-left cell.
			if (newBody[topRow - 1] && newBody[topRow - 1].cells[leftCol - 1]) {
				newBody[topRow - 1].cells[leftCol - 1].rowspan = rowSpan;
				newBody[topRow - 1].cells[leftCol - 1].colspan = colSpan;
			}

			for ( let i = topRow - 1; i < topRow + rowSpan - 1; i++ ) {
				for ( let j = leftCol - 1; j < leftCol + colSpan - 1; j++ ) {
					if (i !== topRow - 1 || j !== leftCol - 1) {
						newBody[i].cells[j].content = null;
					}
				}
			}

			setAttributes({ body: newBody });
		}
	};

	const hasMultipleCellsSelected = () => {
		if (!startCell || !endCell) return false;
		return startCell.row !== endCell.row || startCell.col !== endCell.col;
	};

	useEffect( () => {
		if ( ! isSelected ) {
			setSelectedCell();
		}
	}, [ isSelected ] );

	useEffect( () => {
		if ( hasTableCreated ) {
			tableRef?.current
				?.querySelector( 'td[contentEditable="true"]' )
				?.focus();
			setHasTableCreated( false );
		}
	}, [ hasTableCreated ] );

	const sections = [ 'head', 'body', 'foot' ].filter(
		( name ) => ! isEmptyTableSection( attributes[ name ] )
	);

	const tableControls = [
		{
			icon: tableRowBefore,
			title: __( 'Insert row before' ),
			isDisabled: ! selectedCell,
			onClick: onInsertRowBefore,
		},
		{
			icon: tableRowAfter,
			title: __( 'Insert row after' ),
			isDisabled: ! selectedCell,
			onClick: onInsertRowAfter,
		},
		{
			icon: tableRowDelete,
			title: __( 'Delete row' ),
			isDisabled: ! selectedCell,
			onClick: onDeleteRow,
		},
		{
			icon: tableColumnBefore,
			title: __( 'Insert column before' ),
			isDisabled: ! selectedCell,
			onClick: onInsertColumnBefore,
		},
		{
			icon: tableColumnAfter,
			title: __( 'Insert column after' ),
			isDisabled: ! selectedCell,
			onClick: onInsertColumnAfter,
		},
		{
			icon: tableColumnDelete,
			title: __( 'Delete column' ),
			isDisabled: ! selectedCell,
			onClick: onDeleteColumn,
		},
		{
			title: __( 'Merge cells' ),
			isDisabled: ! hasMultipleCellsSelected(),
			onClick: onMergeCells,
		},
	];

	const renderedSections = sections.map( ( name ) => (
		<TSection name={ name } key={ name }>
			{ attributes[ name ].map( ( { cells }, rowIndex ) => (
				<tr key={ rowIndex }>
					{ cells.map(
						(
							{
								content,
								tag: CellTag,
								scope,
								align,
								colspan,
								rowspan,
							},
							columnIndex
						) => {
							const rowActual = rowIndex + 1;
							const colActual = columnIndex + 1;

							if (isInMergedCell(rowActual, colActual) && !getCellMergeInfo(rowActual, colActual)) {
								return null;
							}

							if ( null === content ) {
								return null;
							}

							return (
								<RichText
									role="button"
									tabIndex={ 0 }
									tagName={ CellTag }
									key={ columnIndex }
									className={ classnames(
										{
											[ `has-text-align-${ align }` ]: align,
										},
										'wp-block-table__cell-content'
									) }
									scope={ CellTag === 'th' ? scope : undefined }
									colSpan={ colspan }
									rowSpan={ rowspan }
									value={ content }
									onChange={ onChange }
									onFocus={ () => {
										setSelectedCell( {
											sectionName: name,
											rowIndex,
											columnIndex,
											type: 'cell',
										} );
									} }
									aria-label={ cellAriaLabel[ name ] }
									placeholder={ placeholder[ name ] }
									onMouseDown={() => handleMouseDown(rowActual, colActual)}
									onMouseOver={() => handleMouseOver(rowActual, colActual)}
									style={{
										padding: '10px',
										border: '1px solid black',
										backgroundColor: isInSelection(rowActual, colActual) && 'body' === name
										  ? 'lightblue'
										  : 'white',
									}}
								/>
							)
						}
					) }
				</tr>
			) ) }
		</TSection>
	) );

	const isEmpty = ! sections.length;

	return (
		<figure { ...useBlockProps( { ref: tableRef } ) }>
			{ ! isEmpty && (
				<>
					<BlockControls group="block">
						<AlignmentControl
							label={ __( 'Change column alignment' ) }
							alignmentControls={ ALIGNMENT_CONTROLS }
							value={ getCellAlignment() }
							onChange={ ( nextAlign ) =>
								onChangeColumnAlignment( nextAlign )
							}
						/>
					</BlockControls>
					<BlockControls group="other">
						<ToolbarDropdownMenu
							hasArrowIndicator
							icon={ table }
							label={ __( 'Edit table' ) }
							controls={ tableControls }
						/>
					</BlockControls>
				</>
			) }
			<InspectorControls>
				<PanelBody
					title={ __( 'Settings' ) }
					className="blocks-table-settings"
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Fixed width table cells' ) }
						checked={ !! hasFixedLayout }
						onChange={ onChangeFixedLayout }
					/>
					{ ! isEmpty && (
						<>
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __( 'Header section' ) }
								checked={ !! ( head && head.length ) }
								onChange={ onToggleHeaderSection }
							/>
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __( 'Footer section' ) }
								checked={ !! ( foot && foot.length ) }
								onChange={ onToggleFooterSection }
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>
			{ ! isEmpty && (
				<table onMouseUp={handleMouseUp}
					className={ classnames(
						colorProps.className,
						borderProps.className,
						{
							'has-fixed-layout': hasFixedLayout,
							// This is required in the editor only to overcome
							// the fact the editor rewrites individual border
							// widths into a shorthand format.
							'has-individual-borders': hasSplitBorders(
								attributes?.style?.border
							),
						}
					) }
					style={ { ...colorProps.style, ...borderProps.style } }
				>
					{ renderedSections }
				</table>
			) }
			{ ! isEmpty && (
				<RichText
					role="button"
					tabIndex={ 0 }
					identifier="caption"
					tagName="figcaption"
					className={ __experimentalGetElementClassName( 'caption' ) }
					aria-label={ __( 'Table caption text' ) }
					placeholder={ __( 'Add caption' ) }
					value={ caption }
					onChange={ ( value ) =>
						setAttributes( { caption: value } )
					}
					// Deselect the selected table cell when the caption is focused.
					onFocus={ () => setSelectedCell() }
					__unstableOnSplitAtEnd={ () =>
						insertBlocksAfter(
							createBlock( getDefaultBlockName() )
						)
					}
				/>
			) }
			{ isEmpty && (
				<Placeholder
					label={ __( 'Table' ) }
					icon={ <BlockIcon icon={ icon } showColors /> }
					instructions={ __( 'Insert a table for sharing data.' ) }
				>
					<form
						className="blocks-table__placeholder-form"
						onSubmit={ onCreateTable }
					>
						<TextControl
							__nextHasNoMarginBottom
							type="number"
							label={ __( 'Column count' ) }
							value={ initialColumnCount }
							onChange={ onChangeInitialColumnCount }
							min="1"
							className="blocks-table__placeholder-input"
						/>
						<TextControl
							__nextHasNoMarginBottom
							type="number"
							label={ __( 'Row count' ) }
							value={ initialRowCount }
							onChange={ onChangeInitialRowCount }
							min="1"
							className="blocks-table__placeholder-input"
						/>
						<Button
							className="blocks-table__placeholder-button"
							variant="primary"
							type="submit"
						>
							{ __( 'Create Table' ) }
						</Button>
					</form>
				</Placeholder>
			) }
		</figure>
	);
}

export default TableEdit;
