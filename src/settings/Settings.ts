import type { App } from 'obsidian';
import { Notice, PluginSettingTab, Setting } from 'obsidian';
import { mount } from 'svelte';
import type MediaDbPlugin from '../main';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import { MEDIA_TYPES } from '../utils/MediaTypeManager';
import { fragWithHTML } from '../utils/Utils';
import { PropertyMapping, PropertyMappingModel, PropertyMappingOption } from './PropertyMapping';
import PropertyMappingModelsComponent from './PropertyMappingModelsComponent.svelte';
import { FileSuggest } from './suggesters/FileSuggest';
import { FolderSuggest } from './suggesters/FolderSuggest';

export interface MediaDbPluginSettings {
	OMDbKey: string;
	MobyGamesKey: string;
	GiantBombKey: string;
	ComicVineKey: string;
	bangumiAccessToken: string;
	bangumiUserId: string;
	bangumiProxyUrl: string;
	sfwFilter: boolean;
	templates: boolean;
	customDateFormat: string;
	openNoteInNewTab: boolean;
	useDefaultFrontMatter: boolean;
	enableTemplaterIntegration: boolean;
	// TODO: disabled for now, as i currently don't have the time to fix this from the original PR that introduced it (#133)
	// apiToggle: {
	// 	OMDbAPI: {
	// 		movie: boolean;
	// 		series: boolean;
	// 		game: boolean;
	// 	};
	// 	MALAPI: {
	// 		movie: boolean;
	// 		series: boolean;
	// 	};
	// 	SteamAPI: {
	// 		game: boolean;
	// 	};
	// 	MobyGamesAPI: {
	// 		game: boolean;
	// 	};
	// };
	movieTemplate: string;
	seriesTemplate: string;
	mangaTemplate: string;
	gameTemplate: string;
	wikiTemplate: string;
	musicReleaseTemplate: string;
	boardgameTemplate: string;
	bookTemplate: string;

	movieFileNameTemplate: string;
	seriesFileNameTemplate: string;
	mangaFileNameTemplate: string;
	gameFileNameTemplate: string;
	wikiFileNameTemplate: string;
	musicReleaseFileNameTemplate: string;
	boardgameFileNameTemplate: string;
	bookFileNameTemplate: string;

	moviePropertyConversionRules: string;
	seriesPropertyConversionRules: string;
	mangaPropertyConversionRules: string;
	gamePropertyConversionRules: string;
	wikiPropertyConversionRules: string;
	musicReleasePropertyConversionRules: string;
	boardgamePropertyConversionRules: string;
	bookPropertyConversionRules: string;

	movieFolder: string;
	seriesFolder: string;
	mangaFolder: string;
	gameFolder: string;
	wikiFolder: string;
	musicReleaseFolder: string;
	boardgameFolder: string;
	bookFolder: string;

	propertyMappingModels: PropertyMappingModel[];
}

const DEFAULT_SETTINGS: MediaDbPluginSettings = {
	OMDbKey: '',
	MobyGamesKey: '',
	GiantBombKey: '',
	ComicVineKey: '',
	bangumiAccessToken: '',
	bangumiUserId: '',
	bangumiProxyUrl: '',
	sfwFilter: true,
	templates: true,
	customDateFormat: 'L',
	openNoteInNewTab: true,
	useDefaultFrontMatter: true,
	enableTemplaterIntegration: false,
	// apiToggle: {
	// 	OMDbAPI: {
	// 		movie: true,
	// 		series: true,
	// 		game: true,
	// 	},
	// 	MALAPI: {
	// 		movie: true,
	// 		series: true,
	// 	},
	// 	SteamAPI: {
	// 		game: true,
	// 	},
	// 	MobyGamesAPI: {
	// 		game: true,
	// 	},
	// },
	movieTemplate: '',
	seriesTemplate: '',
	mangaTemplate: '',
	gameTemplate: '',
	wikiTemplate: '',
	musicReleaseTemplate: '',
	boardgameTemplate: '',
	bookTemplate: '',

	movieFileNameTemplate: '{{ title }} ({{ year }})',
	seriesFileNameTemplate: '{{ title }} ({{ year }})',
	mangaFileNameTemplate: '{{ title }} ({{ year }})',
	gameFileNameTemplate: '{{ title }} ({{ year }})',
	wikiFileNameTemplate: '{{ title }}',
	musicReleaseFileNameTemplate: '{{ title }} (by {{ ENUM:artists }} - {{ year }})',
	boardgameFileNameTemplate: '{{ title }} ({{ year }})',
	bookFileNameTemplate: '{{ title }} ({{ year }})',

	moviePropertyConversionRules: '',
	seriesPropertyConversionRules: '',
	mangaPropertyConversionRules: '',
	gamePropertyConversionRules: '',
	wikiPropertyConversionRules: '',
	musicReleasePropertyConversionRules: '',
	boardgamePropertyConversionRules: '',
	bookPropertyConversionRules: '',

	movieFolder: 'Media DB/movies',
	seriesFolder: 'Media DB/series',
	mangaFolder: 'Media DB/comics',
	gameFolder: 'Media DB/games',
	wikiFolder: 'Media DB/wiki',
	musicReleaseFolder: 'Media DB/music',
	boardgameFolder: 'Media DB/boardgames',
	bookFolder: 'Media DB/books',

	propertyMappingModels: [],
};

export const lockedPropertyMappings: string[] = ['type', 'id', 'dataSource'];

export function getDefaultSettings(plugin: MediaDbPlugin): MediaDbPluginSettings {
	const defaultSettings = DEFAULT_SETTINGS;

	// construct property mapping defaults
	const propertyMappingModels: PropertyMappingModel[] = [];
	for (const mediaType of MEDIA_TYPES) {
		const model: MediaTypeModel = plugin.mediaTypeManager.createMediaTypeModelFromMediaType({}, mediaType);
		const metadataObj = model.toMetaDataObject();
		// console.log(metadataObj);
		// console.log(model);

		const propertyMappingModel: PropertyMappingModel = new PropertyMappingModel(mediaType);

		for (const key of Object.keys(metadataObj)) {
			propertyMappingModel.properties.push(new PropertyMapping(key, '', PropertyMappingOption.Default, lockedPropertyMappings.contains(key)));
		}

		propertyMappingModels.push(propertyMappingModel);
	}

	defaultSettings.propertyMappingModels = propertyMappingModels;
	return defaultSettings;
}

export class MediaDbSettingTab extends PluginSettingTab {
	plugin: MediaDbPlugin;

	constructor(app: App, plugin: MediaDbPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('OMDb API key')
			.setDesc('API key for "www.omdbapi.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.OMDbKey)
					.onChange(data => {
						this.plugin.settings.OMDbKey = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Moby Games key')
			.setDesc('API key for "www.mobygames.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.MobyGamesKey)
					.onChange(data => {
						this.plugin.settings.MobyGamesKey = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Giant Bomb Key')
			.setDesc('API key for "www.giantbomb.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.GiantBombKey)
					.onChange(data => {
						this.plugin.settings.GiantBombKey = data;
						void this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Comic Vine Key')
			.setDesc('API key for "www.comicvine.gamespot.com".')
			.addText(cb => {
				cb.setPlaceholder('API key')
					.setValue(this.plugin.settings.ComicVineKey)
					.onChange(data => {
						this.plugin.settings.ComicVineKey = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Bangumi Access Token')
			.setDesc(fragWithHTML('Access Token for personal data access on <a href="https://next.bgm.tv/demo/access-token" target="_blank">bangumi.tv</a>. Keep this private.'))
			.addText(cb => {
				cb.setPlaceholder('Your Access Token')
					.setValue(this.plugin.settings.bangumiAccessToken)
					.onChange(async (value) => {
						this.plugin.settings.bangumiAccessToken = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Bangumi User ID')
			.setDesc('User ID for Bangumi')
			.addText(cb => {
				cb.setPlaceholder('Your User ID')
					.setValue(this.plugin.settings.bangumiUserId)
					.onChange(async (value) => {
						this.plugin.settings.bangumiUserId = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Bangumi Proxy URL')
			.setDesc('Bangumi API反向代理URL')
			.addText(cb => {
				cb.setPlaceholder('Proxy URL')
					.setValue(this.plugin.settings.bangumiProxyUrl)
					.onChange(data => {
						this.plugin.settings.bangumiProxyUrl = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('SFW filter')
			.setDesc('Only shows SFW results for APIs that offer filtering.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.sfwFilter).onChange(data => {
					this.plugin.settings.sfwFilter = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Resolve {{ tags }} in templates')
			.setDesc('Whether to resolve {{ tags }} in templates. The spaces inside the curly braces are important.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.templates).onChange(data => {
					this.plugin.settings.templates = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Date format')
			.setDesc(
				fragWithHTML(
					"Your custom date format. Use <em>'YYYY-MM-DD'</em> for example.<br>" +
						"For more syntax, refer to <a href='https://momentjs.com/docs/#/displaying/format/'>format reference</a>.<br>" +
						"Your current syntax looks like this: <b><a id='media-db-dateformat-preview' style='pointer-events: none; cursor: default; text-decoration: none;'>" +
						this.plugin.dateFormatter.getPreview() +
						'</a></b>',
				),
			)
			.addText(cb => {
				cb.setPlaceholder(DEFAULT_SETTINGS.customDateFormat)
					.setValue(this.plugin.settings.customDateFormat === DEFAULT_SETTINGS.customDateFormat ? '' : this.plugin.settings.customDateFormat)
					.onChange(data => {
						const newDateFormat = data ? data : DEFAULT_SETTINGS.customDateFormat;
						this.plugin.settings.customDateFormat = newDateFormat;
						const previewEl = document.getElementById('media-db-dateformat-preview');
						if (previewEl) {
							previewEl.textContent = this.plugin.dateFormatter.getPreview(newDateFormat); // update preview
						}
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Open note in new tab')
			.setDesc('Open the newly created note in a new tab.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.openNoteInNewTab).onChange(data => {
					this.plugin.settings.openNoteInNewTab = data;
					void this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Use default front matter')
			.setDesc('Whether to use the default front matter. If disabled, the front matter from the template will be used. Same as mapping everything to remove.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.useDefaultFrontMatter).onChange(data => {
					this.plugin.settings.useDefaultFrontMatter = data;
					void this.plugin.saveSettings();
					// Redraw settings to display/remove the property mappings
					this.display();
				});
			});

		new Setting(containerEl)
			.setName('Enable Templater integration')
			.setDesc(
				'Enable integration with the templater plugin, this also needs templater to be installed. Warning: Templater allows you to execute arbitrary JavaScript code and system commands.',
			)
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.enableTemplaterIntegration).onChange(data => {
					this.plugin.settings.enableTemplaterIntegration = data;
					void this.plugin.saveSettings();
				});
			});

		// containerEl.createEl('h3', { text: 'APIs per media type' });
		// containerEl.createEl('h5', { text: 'Movies' });
		// new Setting(containerEl)
		// 	.setName('OMDb API')
		// 	.setDesc('Use OMDb API for movies.')
		// 	.addToggle(cb => {
		// 		cb.setValue(this.plugin.settings.apiToggle.OMDbAPI.movie).onChange(data => {
		// 			this.plugin.settings.apiToggle.OMDbAPI.movie = data;
		// 			void this.plugin.saveSettings();
		// 		});
		// 	});
		// new Setting(containerEl)
		// 	.setName('MAL API')
		// 	.setDesc('Use MAL API for movies.')
		// 	.addToggle(cb => {
		// 		cb.setValue(this.plugin.settings.apiToggle.MALAPI.movie).onChange(data => {
		// 			this.plugin.settings.apiToggle.MALAPI.movie = data;
		// 			void this.plugin.saveSettings();
		// 		});
		// 	});
		// containerEl.createEl('h5', { text: 'Series' });
		// new Setting(containerEl)
		// 	.setName('OMDb API')
		// 	.setDesc('Use OMDb API for series.')
		// 	.addToggle(cb => {
		// 		cb.setValue(this.plugin.settings.apiToggle.OMDbAPI.series).onChange(data => {
		// 			this.plugin.settings.apiToggle.OMDbAPI.series = data;
		// 			void this.plugin.saveSettings();
		// 		});
		// 	});
		// new Setting(containerEl)
		// 	.setName('MAL API')
		// 	.setDesc('Use MAL API for series.')
		// 	.addToggle(cb => {
		// 		cb.setValue(this.plugin.settings.apiToggle.MALAPI.series).onChange(data => {
		// 			this.plugin.settings.apiToggle.MALAPI.series = data;
		// 			void this.plugin.saveSettings();
		// 		});
		// 	});
		// containerEl.createEl('h5', { text: 'Games' });
		// new Setting(containerEl)
		// 	.setName('OMDb API')
		// 	.setDesc('Use OMDb API for games.')
		// 	.addToggle(cb => {
		// 		cb.setValue(this.plugin.settings.apiToggle.OMDbAPI.game).onChange(data => {
		// 			this.plugin.settings.apiToggle.OMDbAPI.game = data;
		// 			void this.plugin.saveSettings();
		// 		});
		// 	});
		// new Setting(containerEl)
		// 	.setName('Steam API')
		// 	.setDesc('Use OMDb API for games.')
		// 	.addToggle(cb => {
		// 		cb.setValue(this.plugin.settings.apiToggle.SteamAPI.game).onChange(data => {
		// 			this.plugin.settings.apiToggle.SteamAPI.game = data;
		// 			void this.plugin.saveSettings();
		// 		});
		// 	});
		// new Setting(containerEl)
		// 	.setName('MobyGames API')
		// 	.setDesc('Use MobyGames API for games.')
		// 	.addToggle(cb => {
		// 		cb.setValue(this.plugin.settings.apiToggle.MobyGamesAPI.game).onChange(data => {
		// 			this.plugin.settings.apiToggle.MobyGamesAPI.game = data;
		// 			void this.plugin.saveSettings();
		// 		});
		// 	});
		//	new Setting(containerEl)
		//	.setName('Giantbomb API')
		//	.setDesc('Use Giantbomb API for games.')
		//	.addToggle(cb => {
		//		cb.setValue(this.plugin.settings.apiToggle.GiantBombAPI.game).onChange(data => {
		//			this.plugin.settings.apiToggle.GiantBombAPI.game = data;
		//			void this.plugin.saveSettings();
		//		});
		//	});
		new Setting(containerEl).setName('New file location').setHeading();
		// region new file location
		new Setting(containerEl)
			.setName('Movie folder')
			.setDesc('Where newly imported movies should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.movieFolder)
					.setValue(this.plugin.settings.movieFolder)
					.onChange(data => {
						this.plugin.settings.movieFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series folder')
			.setDesc('Where newly imported series should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.seriesFolder)
					.setValue(this.plugin.settings.seriesFolder)
					.onChange(data => {
						this.plugin.settings.seriesFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Comic and manga folder')
			.setDesc('Where newly imported comics and manga should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.mangaFolder)
					.setValue(this.plugin.settings.mangaFolder)
					.onChange(data => {
						this.plugin.settings.mangaFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game folder')
			.setDesc('Where newly imported games should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.gameFolder)
					.setValue(this.plugin.settings.gameFolder)
					.onChange(data => {
						this.plugin.settings.gameFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki folder')
			.setDesc('Where newly imported wiki articles should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.wikiFolder)
					.setValue(this.plugin.settings.wikiFolder)
					.onChange(data => {
						this.plugin.settings.wikiFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music folder')
			.setDesc('Where newly imported music should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.musicReleaseFolder)
					.setValue(this.plugin.settings.musicReleaseFolder)
					.onChange(data => {
						this.plugin.settings.musicReleaseFolder = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board game folder')
			.setDesc('Where newly imported board games should be places.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.boardgameFolder)
					.setValue(this.plugin.settings.boardgameFolder)
					.onChange(data => {
						this.plugin.settings.boardgameFolder = data;
						void this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Book folder')
			.setDesc('Where newly imported books should be placed.')
			.addSearch(cb => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder(DEFAULT_SETTINGS.bookFolder)
					.setValue(this.plugin.settings.bookFolder)
					.onChange(data => {
						this.plugin.settings.bookFolder = data;
						void this.plugin.saveSettings();
					});
			});

		// endregion

		new Setting(containerEl).setName('Template settings').setHeading();
		// region templates
		new Setting(containerEl)
			.setName('Movie template')
			.setDesc('Template file to be used when creating a new note for a movie.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: movieTemplate.md')
					.setValue(this.plugin.settings.movieTemplate)
					.onChange(data => {
						this.plugin.settings.movieTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series template')
			.setDesc('Template file to be used when creating a new note for a series.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: seriesTemplate.md')
					.setValue(this.plugin.settings.seriesTemplate)
					.onChange(data => {
						this.plugin.settings.seriesTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Manga and Comics template')
			.setDesc('Template file to be used when creating a new note for a manga or a comic.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: mangaTemplate.md')
					.setValue(this.plugin.settings.mangaTemplate)
					.onChange(data => {
						this.plugin.settings.mangaTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game template')
			.setDesc('Template file to be used when creating a new note for a game.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: gameTemplate.md')
					.setValue(this.plugin.settings.gameTemplate)
					.onChange(data => {
						this.plugin.settings.gameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki template')
			.setDesc('Template file to be used when creating a new note for a wiki entry.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: wikiTemplate.md')
					.setValue(this.plugin.settings.wikiTemplate)
					.onChange(data => {
						this.plugin.settings.wikiTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music release template')
			.setDesc('Template file to be used when creating a new note for a music release.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: musicReleaseTemplate.md')
					.setValue(this.plugin.settings.musicReleaseTemplate)
					.onChange(data => {
						this.plugin.settings.musicReleaseTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board game template')
			.setDesc('Template file to be used when creating a new note for a boardgame.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: boardgameTemplate.md')
					.setValue(this.plugin.settings.boardgameTemplate)
					.onChange(data => {
						this.plugin.settings.boardgameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Book template')
			.setDesc('Template file to be used when creating a new note for a book.')
			.addSearch(cb => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder('Example: bookTemplate.md')
					.setValue(this.plugin.settings.bookTemplate)
					.onChange(data => {
						this.plugin.settings.bookTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		// endregion

		new Setting(containerEl).setName('File name settings').setHeading();
		// region file name templates
		new Setting(containerEl)
			.setName('Movie file name template')
			.setDesc('Template for the file name used when creating a new note for a movie.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.movieFileNameTemplate}`)
					.setValue(this.plugin.settings.movieFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.movieFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Series file name template')
			.setDesc('Template for the file name used when creating a new note for a series.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.seriesFileNameTemplate}`)
					.setValue(this.plugin.settings.seriesFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.seriesFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Manga and comic file name template')
			.setDesc('Template for the file name used when creating a new note for a manga or comic.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.mangaFileNameTemplate}`)
					.setValue(this.plugin.settings.mangaFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.mangaFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Game file name template')
			.setDesc('Template for the file name used when creating a new note for a game.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.gameFileNameTemplate}`)
					.setValue(this.plugin.settings.gameFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.gameFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Wiki file name template')
			.setDesc('Template for the file name used when creating a new note for a wiki entry.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.wikiFileNameTemplate}`)
					.setValue(this.plugin.settings.wikiFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.wikiFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Music release file name template')
			.setDesc('Template for the file name used when creating a new note for a music release.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.musicReleaseFileNameTemplate}`)
					.setValue(this.plugin.settings.musicReleaseFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.musicReleaseFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Board game file name template')
			.setDesc('Template for the file name used when creating a new note for a boardgame.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.boardgameFileNameTemplate}`)
					.setValue(this.plugin.settings.boardgameFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.boardgameFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Book file name template')
			.setDesc('Template for the file name used when creating a new note for a book.')
			.addText(cb => {
				cb.setPlaceholder(`Example: ${DEFAULT_SETTINGS.bookFileNameTemplate}`)
					.setValue(this.plugin.settings.bookFileNameTemplate)
					.onChange(data => {
						this.plugin.settings.bookFileNameTemplate = data;
						void this.plugin.saveSettings();
					});
			});

		// endregion

		// region Property Mappings
		if (this.plugin.settings.useDefaultFrontMatter) {
			new Setting(containerEl).setName('Property mappings').setHeading();

			const propertyMappingExplanation = containerEl.createEl('div');
			propertyMappingExplanation.innerHTML = `
		<p>Choose how metadata fields are mapped to property names. The options are:</p>
		<ul>
			<li><strong>default</strong>: keep the original name.</li>
			<li><strong>remap</strong>: rename the property.</li>
			<li><strong>remove</strong>: remove the property entirely.</li>
		</ul>
		<p>
			Don't forget to save your changes using the save button for each individual category.
		</p>`;

			mount(PropertyMappingModelsComponent, {
				target: this.containerEl,
				props: {
					models: this.plugin.settings.propertyMappingModels.map(x => x.copy()),
					save: (model: PropertyMappingModel): void => {
						const propertyMappingModels: PropertyMappingModel[] = [];

						for (const model2 of this.plugin.settings.propertyMappingModels) {
							if (model2.type === model.type) {
								propertyMappingModels.push(model);
							} else {
								propertyMappingModels.push(model2);
							}
						}

						this.plugin.settings.propertyMappingModels = propertyMappingModels;
						new Notice(`MDB: Property mappings for ${model.type} saved successfully.`);
						void this.plugin.saveSettings();
					},
				},
			});
		}

		// endregion
	}
}
