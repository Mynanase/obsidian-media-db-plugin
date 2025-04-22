import { Notice } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import { SeriesModel } from '../../models/SeriesModel';
import { ComicMangaModel } from '../../models/ComicMangaModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

export class BangumiAPI extends APIModel {
	plugin: MediaDbPlugin;
	typeMappings: Map<string, string>;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'BangumiAPI';
		this.apiDescription = 'A free API for Anime, Manga, and Games from Bangumi.';
		this.apiUrl = 'https://api.bgm.tv/';
		this.types = [MediaType.Movie, MediaType.Series, MediaType.ComicManga, MediaType.Game];
		this.typeMappings = new Map<string, string>();
		this.typeMappings.set('anime', 'series');
		this.typeMappings.set('movie', 'movie');
		this.typeMappings.set('book', 'comicManga');
		this.typeMappings.set('manga', 'comicManga');
		this.typeMappings.set('game', 'game');
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		// 基本请求头
		const headers: Record<string, string> = {
			'Accept': 'application/json',
			'User-Agent': 'ObsidianMediaDB/1.0'
		};

		// Bangumi API v0 search endpoint
		const searchUrl = `https://api.bgm.tv/search/subject/${encodeURIComponent(title)}?type=0&responseGroup=small&max_results=20`;
		const fetchData = await fetch(searchUrl, {
			headers: headers
		});


		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const data = await fetchData.json();
		
		if (!data.list || data.list.length === 0) {
			return [];
		}

		const ret: MediaTypeModel[] = [];

		for (const result of data.list) {
			// Map Bangumi type to our media types
			// Type: 1=book, 2=anime, 3=music, 4=game, 6=real
			// We'll skip type 6 (real) as it's too ambiguous and type 3 (music) as it's not supported
			let type = '';
			switch (result.type) {
				case 1: // Book
					type = 'comicManga';
					break;
				case 2: // Anime
					// For anime, we need to check the category to determine if it's a movie or series
					// Category 2 = movie, others (like 1 = TV, 3 = OVA, etc.) treated as series
					type = result.category === 2 ? 'movie' : 'series';
					break;
				case 3: // Music
					// Skip music as it's not supported in the current MediaType model
					continue;
				case 4: // Game
					type = 'game';
					break;
				case 6: // Real (live-action)
				default:
					continue; // Skip unsupported types
			}

			// Extract year from date (format: yyyy-mm-dd)
			const year = result.air_date ? result.air_date.substring(0, 4) : '';

			if (type === 'movie') {
				ret.push(
					new MovieModel({
						type: type,
						title: result.name_cn || result.name,
						englishTitle: result.name,
						year: year,
						dataSource: this.apiName,
						id: result.id.toString(),
						image: result.images?.medium || '',
					}),
				);
			} else if (type === 'series') {
				ret.push(
					new SeriesModel({
						type: type,
						title: result.name_cn || result.name,
						englishTitle: result.name,
						year: year,
						dataSource: this.apiName,
						id: result.id.toString(),
						image: result.images?.medium || '',
					}),
				);
			} else if (type === 'comicManga') {
				ret.push(
					new ComicMangaModel({
						type: type,
						title: result.name_cn || result.name,
						englishTitle: result.name,
						year: year,
						dataSource: this.apiName,
						id: result.id.toString(),
						image: result.images?.medium || '',
					}),
				);
			} else if (type === 'game') {
				ret.push(
					new GameModel({
						type: type,
						title: result.name_cn || result.name,
						englishTitle: result.name,
						year: year,
						dataSource: this.apiName,
						id: result.id.toString(),
						image: result.images?.medium || '',
					}),
				);
			}
		}

		return ret;
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		// 基本请求头
		const headers: Record<string, string> = {
			'Accept': 'application/json',
			'User-Agent': 'ObsidianMediaDB/1.0'
		};

		// Bangumi API v0 subject endpoint
		const searchUrl = `https://api.bgm.tv/subject/${encodeURIComponent(id)}?responseGroup=large`;
		const fetchData = await fetch(searchUrl, {
			headers: headers
		});


		if (fetchData.status !== 200) {
			throw Error(`MDB | Received status code ${fetchData.status} from ${this.apiName}.`);
		}

		const result = await fetchData.json();
		
		// Map Bangumi type to our media types
		// Type: 1=book, 2=anime, 3=music, 4=game, 6=real
		let type = '';
		switch (result.type) {
			case 1: // Book
				type = 'comicManga';
				break;
			case 2: // Anime
				// For anime, we need to check the category to determine if it's a movie or series
				// Category 2 = movie, others (like 1 = TV, 3 = OVA, etc.) treated as series
				type = result.category === 2 ? 'movie' : 'series';
				break;
			case 3: // Music
				throw Error(`MDB | Music type not supported for id ${id}`);
			case 4: // Game
				type = 'game';
				break;
			case 6: // Real (live-action)
				throw Error(`MDB | Real (live-action) type not supported for id ${id}`);
			default:
				throw Error(`MDB | Unknown media type ${result.type} for id ${id}`);
		}

		// Extract year from date (format: yyyy-mm-dd)
		const year = result.air_date ? result.air_date.substring(0, 4) : '';
		
		// Extract genres
		const genres = result.tags ? result.tags.map((tag: any) => tag.name) : [];
		
		// Create URL to Bangumi page
		const url = `https://bgm.tv/subject/${id}`;

		if (type === 'movie') {
			return new MovieModel({
				type: type,
				title: result.name_cn || result.name,
				englishTitle: result.name,
				year: year,
				dataSource: this.apiName,
				url: url,
				id: result.id.toString(),

				plot: result.summary || '',
				genres: genres,
				director: result.staff ? this.extractStaff(result.staff, '导演') : [],
				writer: result.staff ? this.extractStaff(result.staff, '脚本') : [],
				studio: result.producer || [],
				duration: result.duration || 'unknown',
				onlineRating: result.rating?.score || 0,
				actors: result.crt ? result.crt.map((actor: any) => actor.name) : [],
				image: result.images?.large || '',

				released: true,
				streamingServices: [],
				premiere: this.plugin.dateFormatter.format(result.air_date, this.apiDateFormat) || 'unknown',

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			});
		} else if (type === 'series') {
			return new SeriesModel({
				type: type,
				title: result.name_cn || result.name,
				englishTitle: result.name,
				year: year,
				dataSource: this.apiName,
				url: url,
				id: result.id.toString(),

				plot: result.summary || '',
				genres: genres,
				writer: result.staff ? this.extractStaff(result.staff, '脚本') : [],
				studio: result.producer || [],
				episodes: result.eps_count || 0,
				duration: result.duration || 'unknown',
				onlineRating: result.rating?.score || 0,
				actors: result.crt ? result.crt.map((actor: any) => actor.name) : [],
				image: result.images?.large || '',

				released: true,
				streamingServices: [],
				airing: result.air_status === 'Air',
				airedFrom: this.plugin.dateFormatter.format(result.air_date, this.apiDateFormat) || 'unknown',
				airedTo: result.end_date ? (this.plugin.dateFormatter.format(result.end_date, this.apiDateFormat) || 'unknown') : 'unknown',

				userData: {
					watched: false,
					lastWatched: '',
					personalRating: 0,
				},
			});
		} else if (type === 'comicManga') {
			return new ComicMangaModel({
				type: type,
				title: result.name_cn || result.name,
				englishTitle: result.name,
				alternateTitles: [result.name_cn, result.name].filter(Boolean),
				year: year,
				dataSource: this.apiName,
				url: url,
				id: result.id.toString(),

				plot: result.summary || '',
				genres: genres,
				authors: result.staff ? this.extractStaff(result.staff, '作者') : [],
				chapters: result.eps_count || 0,
				volumes: result.volumes || 0,
				onlineRating: result.rating?.score || 0,
				image: result.images?.large || '',

				released: true,
				publishers: result.producer || [],
				publishedFrom: this.plugin.dateFormatter.format(result.air_date, this.apiDateFormat) || 'unknown',
				publishedTo: result.end_date ? (this.plugin.dateFormatter.format(result.end_date, this.apiDateFormat) || 'unknown') : 'unknown',
				status: this.mapStatus(result.air_status),

				userData: {
					read: false,
					lastRead: '',
					personalRating: 0,
				},
			});
		} else if (type === 'game') {
			return new GameModel({
				type: type,
				title: result.name_cn || result.name,
				englishTitle: result.name,
				year: year,
				dataSource: this.apiName,
				url: url,
				id: result.id.toString(),

				developers: result.producer || [],
				publishers: result.producer || [],
				genres: genres,
				onlineRating: result.rating?.score || 0,
				image: result.images?.large || '',

				released: true,
				releaseDate: this.plugin.dateFormatter.format(result.air_date, this.apiDateFormat) || 'unknown',

				userData: {
					played: false,
					personalRating: 0,
				},
			});
		}

		throw new Error(`MDB | Unknown media type for id ${id}`);
	}

	// Helper method to extract staff by role
	private extractStaff(staff: any[], role: string): string[] {
		if (!staff || !Array.isArray(staff)) return [];
		
		return staff
			.filter(person => person.role && person.role.includes(role))
			.map(person => person.name);
	}

	// Helper method to map Bangumi status to plugin status
	private mapStatus(status: string): string {
		switch (status) {
			case 'Air': return 'Ongoing';
			case 'NA': return 'Not yet aired';
			case 'End': return 'Completed';
			default: return status;
		}
	}
}
