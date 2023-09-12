/**
 * External dependencies
 */
import classnames from 'classnames';
import { cloneDeep } from 'lodash';

/**
 * WordPress dependencies
 */
import {
	RichText,
	useBlockProps,
	__experimentalGetBorderClassesAndStyles as getBorderClassesAndStyles,
	__experimentalGetColorClassesAndStyles as getColorClassesAndStyles,
	__experimentalGetElementClassName,
} from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { hasFixedLayout, head, body, foot, caption, nullCells } = attributes;
	const isEmpty = ! head.length && ! body.length && ! foot.length;

	if ( isEmpty ) {
		return null;
	}

	const colorProps = getColorClassesAndStyles( attributes );
	const borderProps = getBorderClassesAndStyles( attributes );

	const classes = classnames( colorProps.className, borderProps.className, {
		'has-fixed-layout': hasFixedLayout,
	} );

	const hasCaption = ! RichText.isEmpty( caption );

	const Section = ( { type, rows } ) => {
		if ( ! rows.length ) {
			return null;
		}

		const Tag = `t${ type }`;

		return (
			<Tag>
				{ rows.map( ( { cells }, rowIndex ) => (
					<tr key={ rowIndex }>
						{ cells.map(
							(
								{
									content,
									tag,
									scope,
									align,
									colspan,
									rowspan,
								},
								columnIndex
							) => {
								const cellClasses = classnames( {
									[ `has-text-align-${ align }` ]: align,
								} );

								const isNull =  Array.isArray( nullCells ) && nullCells.includes( `${ rowIndex + 1 }-${ columnIndex + 1 }` );
								return (
									<RichText.Content
										data-is-null={ isNull ? 'yes' : 'no' }
										className={
											cellClasses
												? cellClasses
												: undefined
										}
										data-align={ align }
										tagName={ tag }
										value={ content }
										key={ columnIndex }
										scope={
											tag === 'th' ? scope : undefined
										}
										colSpan={ colspan }
										rowSpan={ rowspan }
									/>
								);
							}
						) }
					</tr>
				) ) }
			</Tag>
		);
	};

	return (
		<figure { ...useBlockProps.save() }>
			<table
				className={ classes === '' ? undefined : classes }
				style={ { ...colorProps.style, ...borderProps.style } }
			>
				<Section type="head" rows={ head } />
				<Section type="body" rows={ body } />
				<Section type="foot" rows={ foot } />
			</table>
			{ hasCaption && (
				<RichText.Content
					tagName="figcaption"
					value={ caption }
					className={ __experimentalGetElementClassName( 'caption' ) }
				/>
			) }
		</figure>
	);
}
