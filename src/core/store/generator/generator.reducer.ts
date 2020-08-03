import { AnyAction } from 'redux';
import { generate } from 'shortid';
// @ts-ignore-line
import config from '../../../../dist/config.client';
import * as actions from './generator.actions';
import { BuilderLayout } from '../../builder/Builder.component';
import { ExportSettingsTab } from '../../exportSettings/ExportSettings.types';
import { DataTypeFolder, ExportTypeFolder } from '../../../_plugins';
import { dataTypeNames } from '~utils/dataTypeUtils';
import { exportTypeNames } from '~utils/exportTypeUtils';

export type DataRow = {
	id: string;
	title: string;
	dataType: DataTypeFolder | null;
	data: any;
};

export type DataRows = {
	[id: string]: DataRow;
};

export type PreviewData = {
	[id: string]: any;
};

// we store all settings separately so in case a user switches from one to another, the previous settings aren't
// wiped out
export type ExportTypeSettings = {
	[exportType in ExportTypeFolder]: any;
};

export type GeneratorPanel = 'grid' | 'preview';

export type GeneratorState = {
	loadedDataTypes: {
		[str in DataTypeFolder]: boolean;
	};
	loadedExportTypes: {
		[str in ExportTypeFolder]: boolean;
	};

	// this is set to true on load after all necessary export types, data types for whatever last config they
	// has have loaded, as well as re-generate a new batch of preview data. It's used to show a spinner in the
	// Preview panel until it's ready to show data
	initialDependenciesLoaded: boolean;
	exportType: ExportTypeFolder;
	rows: DataRows;
	sortedRows: string[];
	showGrid: boolean;
	showPreview: boolean;
	smallScreenVisiblePanel: GeneratorPanel;
	builderLayout: BuilderLayout;
	showExportSettings: boolean;
	exportTypeSettings: Partial<ExportTypeSettings>;
	showGenerationPanel: boolean;
	showRowNumbers: boolean;
	enableLineWrapping: boolean;
	theme: string;
	previewTextSize: number;
	dataTypePreviewData: PreviewData;
	exportSettingsTab: ExportSettingsTab;
	numPreviewRows: number;
	stripWhitespace: boolean;
	lastLayoutWidth: number | null;
	lastLayoutHeight: number | null;
	isGenerating: boolean;
	numRowsToGenerate: number;
	numGeneratedRows: number;
};

export const getInitialState = (): GeneratorState => ({
	loadedDataTypes: dataTypeNames.reduce((acc: any, name: DataTypeFolder) => ({ ...acc, [name]: false }), {}),
	loadedExportTypes: exportTypeNames.reduce((acc: any, name: ExportTypeFolder) => ({ ...acc, [name]: false }), {}),
	initialDependenciesLoaded: false,
	exportType: config.defaultExportType,
	rows: {},
	sortedRows: [],
	showGrid: true,
	showPreview: true,
	smallScreenVisiblePanel: 'grid',
	builderLayout: 'horizontal',
	showExportSettings: false,
	exportTypeSettings: {},
	numPreviewRows: 5,
	showRowNumbers: false,
	enableLineWrapping: true,
	theme: 'lucario',
	previewTextSize: 12,
	dataTypePreviewData: {},
	exportSettingsTab: 'exportType',
	showGenerationPanel: false,
	numRowsToGenerate: 100,
	stripWhitespace: false,
	lastLayoutWidth: null,
	lastLayoutHeight: null,
	isGenerating: false,
	numGeneratedRows: 0
});

export const reducer = (state = getInitialState(), action: AnyAction): GeneratorState => {
	switch (action.type) {
		case actions.CLEAR_GRID:
			return {
				...state,
				rows: {},
				sortedRows: []
			};

		case actions.DATA_TYPE_LOADED:
			return {
				...state,
				loadedDataTypes: {
					...state.loadedDataTypes,
					[action.payload.dataType]: true
				}
			};

		case actions.EXPORT_TYPE_LOADED: {
			const newState = {
				...state,
				loadedExportTypes: {
					...state.loadedExportTypes,
					[action.payload.exportType]: true
				}
			};

			// we only ever initialize the export settings to the initial state when the export type hasn't been
			// loaded yet. Note: this'll be an interesting upgrade problem
			if (!state.exportTypeSettings[action.payload.exportType as ExportTypeFolder]) {
				newState.exportTypeSettings = {
					...state.exportTypeSettings,
					[action.payload.exportType]: action.payload.initialState
				};
			}

			return newState;
		}

		case actions.ADD_ROWS: {
			const newRows: DataRows = {};
			const newRowIDs: string[] = [];
			for (let i = 0; i < action.payload.numRows; i++) {
				const rowId = generate();
				newRows[rowId] = {
					id: rowId,
					title: '',
					dataType: null,
					data: null
				};
				newRowIDs.push(rowId);
			}

			return {
				...state,
				rows: {
					...state.rows,
					...newRows
				},
				sortedRows: [
					...state.sortedRows,
					...newRowIDs
				]
			};
		}

		case actions.REMOVE_ROW: {
			const trimmedRowIds = state.sortedRows.filter((i) => i !== action.payload.id);
			const updatedRows: DataRows = {};
			trimmedRowIds.forEach((id) => {
				updatedRows[id] = state.rows[id];
			});
			return {
				...state,
				rows: updatedRows,
				sortedRows: trimmedRowIds
			};
		}

		case actions.CHANGE_TITLE:
			return {
				...state,
				rows: {
					...state.rows,
					[action.payload.id]: {
						...state.rows[action.payload.id],
						title: action.payload.value
					}
				}
			};

		case actions.SELECT_DATA_TYPE: {
			const { id, value, data, defaultTitle } = action.payload;
			const title = (state.rows[id].title) ? state.rows[id].title : defaultTitle;

			return {
				...state,
				rows: {
					...state.rows,
					[id]: {
						...state.rows[id],
						dataType: value,
						data,
						title
					}
				}
			};
		}

		case actions.SELECT_EXPORT_TYPE: {
			return {
				...state,
				exportType: action.payload.exportType
			};
		}

		case actions.REFRESH_PREVIEW_DATA: {
			return {
				...state,
				dataTypePreviewData: {
					...action.payload.dataTypePreviewData
				}
			};
		}

		case actions.CONFIGURE_DATA_TYPE:
			return {
				...state,
				rows: {
					...state.rows,
					[action.payload.id]: {
						...state.rows[action.payload.id],
						data: action.payload.data
					}
				},
			};

		case actions.CONFIGURE_EXPORT_TYPE: {
			return {
				...state,
				exportTypeSettings: {
					...state.exportTypeSettings,
					[state.exportType]: action.payload.data
				}
			};
		}

		case actions.REPOSITION_ROW: {
			const newArray = state.sortedRows.filter((i) => i !== action.payload.id);
			newArray.splice(action.payload.newIndex, 0, action.payload.id);
			return {
				...state,
				sortedRows: newArray
			};
		}

		case actions.TOGGLE_GRID: {
			const newState = {
				...state,
				showGrid: !state.showGrid
			};
			if (!state.showPreview) {
				newState.showPreview = true;
			}
			return newState;
		}

		case actions.TOGGLE_PREVIEW: {
			const newState = {
				...state,
				showPreview: !state.showPreview
			};
			if (!state.showGrid) {
				newState.showGrid = true;
			}
			return newState;
		}

		case actions.TOGGLE_LAYOUT:
			return {
				...state,
				builderLayout: state.builderLayout === 'horizontal' ? 'vertical' : 'horizontal'
			};

		case actions.TOGGLE_LINE_WRAPPING:
			return {
				...state,
				enableLineWrapping: !state.enableLineWrapping
			};

		case actions.UPDATE_NUM_PREVIEW_ROWS:
			return {
				...state,
				numPreviewRows: action.payload.numRows
			};

		case actions.CHANGE_THEME:
			return {
				...state,
				theme: action.payload.theme
			};

		case actions.TOGGLE_SHOW_ROW_NUMBERS:
			return {
				...state,
				showRowNumbers: !state.showRowNumbers
			};

		case actions.SET_PREVIEW_TEXT_SIZE:
			return {
				...state,
				previewTextSize: action.payload.previewTextSize
			};

		case actions.TOGGLE_EXPORT_SETTINGS: {
			const newState = {
				...state,
				showExportSettings: !state.showExportSettings
			};
			if (action.payload.tab) {
				newState.exportSettingsTab = action.payload.tab;
			}
			return newState;
		}

		case actions.SHOW_GENERATION_PANEL:
			return {
				...state,
				showGenerationPanel: true
			};

		case actions.HIDE_GENERATION_PANEL:
			return {
				...state,
				showGenerationPanel: false
			};

		case actions.UPDATE_NUM_ROWS_TO_GENERATE:
			return {
				...state,
				numRowsToGenerate: parseInt(action.payload.numRowsToGenerate, 10)
			};

		case actions.UPDATE_GENERATED_ROWS_COUNT: {
			const { numGeneratedRows } = action.payload;
			return {
				...state,
				numGeneratedRows
			};
		}

		case actions.CANCEL_GENERATION:
			return {
				...state,
				isGenerating: false,
				numGeneratedRows: 0
			};

		case actions.TOGGLE_STRIP_WHITESPACE:
			return {
				...state,
				stripWhitespace: !action.payload.stripWhitespace
			};

		case actions.SET_PANEL_SIZE: {
			const setting = state.builderLayout === 'horizontal' ? 'lastLayoutHeight' : 'lastLayoutWidth';
			return {
				...state,
				[setting]: action.payload.size
			};
		}

		case actions.CHANGE_SMALL_SCREEN_VISIBLE_PANEL: {
			return {
				...state,
				smallScreenVisiblePanel: state.smallScreenVisiblePanel === 'grid' ? 'preview' : 'grid'
			};
		}

		case actions.START_GENERATION:
			return {
				...state,
				isGenerating: true,
				numGeneratedRows: 0
			};

		case actions.SET_INITIAL_DEPENDENCIES_LOADED:
			return {
				...state,
				initialDependenciesLoaded: true
			};

		default:
			return state;
	}
};

export default reducer;
