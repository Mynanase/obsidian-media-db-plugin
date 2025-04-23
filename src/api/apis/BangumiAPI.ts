import { requestUrl, Notice, Platform } from 'obsidian';
import type MediaDbPlugin from '../../main';
import { GameModel } from '../../models/GameModel';
import type { MediaTypeModel } from '../../models/MediaTypeModel';
import { MovieModel } from '../../models/MovieModel';
import { SeriesModel } from '../../models/SeriesModel';
import { MusicReleaseModel } from '../../models/MusicReleaseModel';
import { BoardGameModel } from '../../models/BoardGameModel';
import { BookModel } from '../../models/BookModel';
import { ComicMangaModel } from '../../models/ComicMangaModel';
import { MediaType } from '../../utils/MediaType';
import { APIModel } from '../APIModel';

export class BangumiAPI extends APIModel {
	plugin: MediaDbPlugin;
	apiDateFormat: string = 'YYYY-MM-DD';

	constructor(plugin: MediaDbPlugin) {
		super();

		this.plugin = plugin;
		this.apiName = 'BangumiAPI';
		this.apiDescription = 'A free API for Anime, Manga, Games, Music, and Real from Bangumi.';
		
		// 默认API URL
		this.apiUrl = 'https://bangumi.mynanase.workers.dev/';
		
		// 只有当settings已加载时才尝试读取代理URL
		if (this.plugin.settings) {
			// 使用自定义代理URL（如果已设置）
			if (this.plugin.settings.bangumiProxyUrl && this.plugin.settings.bangumiProxyUrl.trim() !== '') {
				// 确保URL以斜杠结尾
				let proxyUrl = this.plugin.settings.bangumiProxyUrl.trim();
				if (!proxyUrl.endsWith('/')) {
					proxyUrl += '/';
				}
				this.apiUrl = proxyUrl;
				console.log(`MDB | BangumiAPI | Using custom proxy URL: ${this.apiUrl}`);
			}
		} else {
			console.log('MDB | BangumiAPI | Settings not loaded yet, using default API URL');
		}
		
		this.types = [MediaType.Movie, MediaType.Series, MediaType.ComicManga, MediaType.Game, MediaType.BoardGame, MediaType.MusicRelease, MediaType.Book];
	}

	async searchByTitle(title: string): Promise<MediaTypeModel[]> {
		console.log(`MDB | api "${this.apiName}" queried by Title`);

		try {
			// Use Obsidian's requestUrl instead of the library to avoid CORS and header issues
			const encodedTitle = encodeURIComponent(title);
			
			const searchUrl = `${this.apiUrl}search/subject/${encodedTitle}?responseGroup=large`; // Reverted based on working curl example
			
			console.log(`MDB | BangumiAPI | Searching with URL: ${searchUrl}`);
			
			const searchResponse = await requestUrl({
				url: searchUrl,
				method: 'GET',
				headers: { // Add headers object
					'accept': 'application/json',
					'User-Agent': 'mynanase/obsidian-media-db-plugin (https://github.com/Mynanase/obsidian-media-db-plugin)',
				}
			});
			
			// Handle 404 specifically as "not found"
			if (searchResponse.status === 404) {
				console.log(`MDB | BangumiAPI | Search for "${title}" returned 404 (Not Found). Returning empty results.`);
				return [];
			}

			if (searchResponse.status !== 200) {
				// Log other non-200 statuses as warnings/errors
				console.warn(`MDB | BangumiAPI | Search request failed with status ${searchResponse.status}. URL: ${searchUrl}`);
				// Throw an error or return empty array based on how strict you want to be
				// For now, returning empty to prevent breaking the flow, but logging a warning.
				return []; 
			}
			
			const data = searchResponse.json;
			// Log the raw response to see its structure
			console.log('MDB | BangumiAPI | Raw search response:', data);
			// Check if 'list' exists and is an array before proceeding
			if (!data || !Array.isArray(data.list)) {
				console.log('MDB | BangumiAPI | No search results found in response or invalid format.');
				return [];
			}

			const results: MediaTypeModel[] = [];
			for (const result of data.list) {
				// Skip if essential info is missing
				if (!result.id || !result.type) {
					console.warn('MDB | BangumiAPI | Skipping search result with missing ID or type:', result);
					continue;
				}

				let type: MediaType;
				const subType: string | undefined = undefined; // Subtype is unreliable in search results
				const year = result.air_date ? result.air_date.split('-')[0] : ''; // Use 'air_date'

				switch (result.type) {
					case 1: // Book
						type = MediaType.Book;
						break;
					case 2: // Anime
						// Subtypes (TV, OVA, Movie) are better determined in getById from infobox/tags
						type = MediaType.Series;
						break;
					case 3: // Music
						type = MediaType.MusicRelease;
						break;
					case 4: // Game
						type = MediaType.Game;
						break;
					case 6: // Real
						type = MediaType.Series;
						break;
					default:
						console.warn(`MDB | BangumiAPI | Unknown Bangumi type ${result.type ?? 'N/A'} for search result ${result.id}`);
						continue; // Skip this result
				}

				const modelData = {
					type: type as any,
					subType: subType,
					title: result.name_cn || result.name,
					englishTitle: result.name,
					year: year,
					dataSource: this.apiName,
					id: result.id.toString(),
					image: result.images?.large || result.images?.medium || '',
				};

				// Create the appropriate model instance based on type
				let model: MediaTypeModel;
				try {
					// Cast type to any as workaround for comparison errors
					switch (type as any) {
						case MediaType.Movie:
							model = new MovieModel(modelData);
							break;
						case MediaType.Series:
							model = new SeriesModel(modelData);
							break;
						case MediaType.Game:
							model = new GameModel(modelData);
							break;
						case MediaType.BoardGame:
							model = new BoardGameModel(modelData); // Assuming constructor matches
							break;
						case MediaType.MusicRelease:
							model = new MusicReleaseModel(modelData);
							break;
						case MediaType.Book:
							// Note: search results don't distinguish between Book/ComicManga
							// getById would refine this
							model = new BookModel(modelData);
							break;
						default:
							// Should not happen due to checks above, but satisfy compiler
							console.warn(`MDB | BangumiAPI | Model creation skipped for unexpected type in search: ${type}`);
							continue;
					}
					results.push(model);
				} catch (e) {
					console.error(`MDB | BangumiAPI | Error creating model for search result ${result.id}`, e);
				}
			}

			return results;
		} catch (error) {
			console.error(`MDB | BangumiAPI | Error during searchByTitle for "${title}":`, error);
			// Log additional details if available (e.g., from axios error)
			if (error && typeof error === 'object') {
				if ('response' in error && error.response) {
					console.error('MDB | BangumiAPI | Error response:', error.response);
				}
				if ('request' in error && error.request) {
					console.error('MDB | BangumiAPI | Error request:', error.request);
				}
				if ('message' in error) {
					console.error('MDB | BangumiAPI | Error message:', error.message);
				}
			}
			// Optionally check if it's a BangumiApiError and handle specific statuses (e.g., 401 Unauthorized)
			// if (error instanceof BangumiApiError) { ... }
			// For now, just return empty array on error
			return [];
		}
	}

	async getById(id: string): Promise<MediaTypeModel> {
		console.log(`MDB | api "${this.apiName}" queried by ID`);

		const accessToken = this.plugin.settings?.bangumiAccessToken;
		const userId = this.plugin.settings?.bangumiUserId; // Get user ID from settings
		let subjectData: any;
		let userData: any = null; // User collection data is optional
		let fetchedFromCollection = false;

		try {
			// 1. Fetch user collection data (if token and user ID are available)
			if (accessToken && userId) {
				try {
					const userCollectionUrl = `${this.apiUrl}v0/users/${userId}/collections/${id}`;
					console.log(`MDB | BangumiAPI | Fetching user collection data: ${userCollectionUrl}`);
					const userCollectionResponse = await requestUrl({
						url: userCollectionUrl,
						method: 'GET',
						headers: {
							'Authorization': `Bearer ${accessToken}`, // Include token here
							'accept': 'application/json',
							'User-Agent': 'mynanase/obsidian-media-db-plugin (https://github.com/Mynanase/obsidian-media-db-plugin)', // Consistent User-Agent
						},
					});

					if (userCollectionResponse.status === 200) {
						userData = userCollectionResponse.json;
						fetchedFromCollection = true;
						console.log(`MDB | BangumiAPI | Successfully fetched user data for ${id}`);
					} else {
						console.warn(`MDB | BangumiAPI | Failed to fetch user collection data for ${id}. Status: ${userCollectionResponse.status}. Proceeding with public data.`);
						// Don't throw error here, just log and continue to public endpoint
					}
				} catch (userError) {
					console.warn(`MDB | BangumiAPI | Error fetching user collection data for ${id}:`, userError);
					// Proceed to public endpoint even if user collection fails
				}
			} else {
				console.log(`MDB | BangumiAPI | Access token or User ID not provided. Skipping user collection fetch for ${id}.`);
			}

			// 2. Fetch public subject data (always required)
			const subjectUrl = `${this.apiUrl}v0/subjects/${id}`;
			console.log(`MDB | BangumiAPI | Fetching public subject data: ${subjectUrl}`);
			const subjectResponse = await requestUrl({
				url: subjectUrl,
				method: 'GET',
				headers: { // Explicitly define headers WITHOUT Authorization
					'accept': 'application/json',
					'User-Agent': 'mynanase/obsidian-media-db-plugin (https://github.com/Mynanase/obsidian-media-db-plugin)', // Consistent User-Agent
				},
			});

			if (subjectResponse.status !== 200) {
				throw new Error(`MDB | BangumiAPI | Failed to fetch subject details for ${id}. Status: ${subjectResponse.status}`);
			}
			subjectData = subjectResponse.json;

			// Check if subjectData is valid
			if (!subjectData || !subjectData.id) {
				throw new Error(`MDB | BangumiAPI | Invalid or empty subject data received for ${id}.`);
			}

			// --- Process the fetched subjectData and userData --- 

			if (!subjectData) {
				throw new Error(`MDB | BangumiAPI | Could not retrieve subject data for ID ${id}.`);
			}

			// Determine MediaType and SubType from subjectData.type and subjectData.tags/infobox
			let type: MediaType;
			let subType: string | null = null;
			const bangumiType = subjectData.type; // 1: Book, 2: Anime, 3: Music, 4: Game, 6: Real(三次元)

			switch (bangumiType) {
				case 1: // Book
					type = MediaType.Book;
					// Check tags or infobox for subtypes like Novel, Artbook, Manga (Manga should ideally be ComicManga)
					// Example check (needs refinement based on actual tags/infobox data)
					if (subjectData.platform === "漫画") subType = 'Manga';
					else if (subjectData.platform === '小说') subType = 'Novel';
					else if (subjectData.platform === '画集') subType = 'Artbook';
					else if (subjectData.platform === '绘本') subType = 'PictureBook';
					else if (subjectData.platform === '公式书') subType = 'GuideBook';
					else if (subjectData.platform === '写真') subType = 'PhotoBook';
					else subType = 'Other'; // Default book subtype
					break;
				case 2: // Anime
					type = MediaType.Series; // Default to Series for Anime
					// Check infobox for 'TV', 'OVA', 'Movie'
					if (subjectData.platform === 'TV') subType = 'TV';
					else if (subjectData.platform === 'OVA')
						if (subjectData.eps === 1) type = MediaType.Movie, subType = 'OVA';
						else subType = 'OVA';
					else if (subjectData.platform === 'WEB') subType = 'WEB';
					else if (subjectData.platform === '剧场版') subType = '';
					else if (subjectData.platform === 'Movie') type = MediaType.Movie, subType = 'Anime';
					else if (subjectData.platform === '动态漫画') subType = 'MotionComic';
					else subType = 'Other'; // General Anime if subtype unclear
					break;
				case 3: // Music
					type = MediaType.MusicRelease;
					break;
				case 4: // Game
					type = MediaType.Game;
					if (subjectData.platform === '游戏') subType = 'videoGame'; // Check platform
					else if (subjectData.platform === '扩展包') subType = 'DLC'; // Check platform
					else if (subjectData.platform === '桌游') type = MediaType.BoardGame; // Check platform
					else subType = 'videoGame'; // Default to videoGame if platform doesn't match known subtypes
					break;
				case 6: // Real (三次元) - Often TV Dramas or Movies
					type = MediaType.Series;
					if (subjectData.platform === '电影') type = MediaType.Movie;
					else if (subjectData.platform === '日剧') subType = 'JPTV';
					else if (subjectData.platform === '华语剧') subType = 'CNTV';
					else if (subjectData.platform === '欧美剧') subType = 'ENTV';
					else if (subjectData.platform === '电视剧') subType = 'TV';
					else if (subjectData.platform === '演出') 
						subType = 'Live';
						if (subjectData.eps === 1) type = MediaType.Movie;
					else if (subjectData.platform === '综艺') subType = 'Show';
					else subType = 'Other';
					break;
				default:
					console.warn(`MDB | BangumiAPI | Unknown Bangumi type: ${bangumiType} for ID ${id}. Defaulting to Series.`);
					type = MediaType.Series; // Default type if unknown
			}

			// --- Extract Common Fields --- 
			const year = subjectData.date ? new Date(subjectData.date).getFullYear().toString() : '';
			const releaseDateString = subjectData.date ? new Date(subjectData.date).toISOString() : '';
			let releasedStatus = false; // Default to not released
			if (releaseDateString) {
				const releaseDateTime = new Date(releaseDateString);
				if (!isNaN(releaseDateTime.getTime())) { // Check if the date is valid
					releasedStatus = releaseDateTime <= new Date(); // Compare with current time
				}
			}
			
			let primaryTitle = subjectData.name_cn || subjectData.name;
			let englishTitle = subjectData.name;
			if (subjectData.name_cn && subjectData.name) {
				// If both exist, name_cn is primary, name is english/original
				primaryTitle = subjectData.name_cn;
				englishTitle = subjectData.name;
			} else if (!subjectData.name_cn && subjectData.name) {
				// If only name exists, use it as primary, clear english
				primaryTitle = subjectData.name;
				englishTitle = ''; // Or maybe keep it as name? Depends on desired behavior
			}
			// Further check Aliases if needed, Bangumi API doesn't provide them directly in subject details

			const title = primaryTitle;
			const imageUrl = subjectData.images?.large || subjectData.images?.common || subjectData.images?.medium || '';
			const description = subjectData.summary || '';
			const rating = subjectData.rating?.score || undefined; // Public rating (number or undefined)
			// Extract top 5 tags based on count from subjectData
			const apiTags = subjectData.tags && Array.isArray(subjectData.tags) // Renamed to apiTags
				? subjectData.tags
					.slice(0, 5) // Take top 5
					.map((tag: { name: string }) => tag.name) // Extract names
				: []; // Default to empty array if no tags
			const genres = this.extractInfoArray(subjectData.infobox, ['游戏类型', '体裁', '题材']);

			// --- Extract Personal Fields (from userData if available) --- 
			const personalRating = userData?.rate; // Already a string or undefined
			const personalTags = userData?.tags; // Already an array or undefined
			let personalStatus: string | undefined = undefined;
			if (userData?.type !== undefined) {
				switch (userData.type) {
					case 1: personalStatus = 'Wish'; break;    // 想做
					case 2: personalStatus = 'Collect'; break; // 做过
					case 3: personalStatus = 'Doing'; break;   // 在做
					case 4: personalStatus = 'OnHold'; break; // 搁置
					case 5: personalStatus = 'Dropped'; break; // 抛弃
				}
			}

			// --- Extract Role-Specific Fields --- 
			// These are generally from subjectData.infobox
			const director = this.extractInfoArray(subjectData.infobox, ['导演']);
			const producer = this.extractInfoArray(subjectData.infobox, ['制作人']);
			const supervisor = this.extractInfoArray(subjectData.infobox, ['监督']);
			const designer = this.extractInfoArray(subjectData.infobox, ['设计师', '游戏设计师']);
			const programmer = this.extractInfoArray(subjectData.infobox, ['程序']);
			const soundDirector = this.extractInfoArray(subjectData.infobox, ['音响监督']);
			const writer = this.extractInfoArray(subjectData.infobox, ['脚本', '原作']);
			const cast = this.extractInfoArray(subjectData.infobox, ['主演', '声优', 'cv', 'キャスト']);
			const publisher = this.extractInfoArray(subjectData.infobox, ['出版社', '唱片公司', '发行']);
			const developer = this.extractInfoArray(subjectData.infobox, ['开发', '游戏开发']); // Remember to add '游戏开发商' here again if needed
			const website = this.extractInfoArray(subjectData.infobox, ['website']);
			const composer = this.extractInfoArray(subjectData.infobox, ['音乐']);
			const artist = this.extractInfoArray(subjectData.infobox, ['美工', '美术']);

			// --- Construct Model --- 
			const modelData: any = {
				type: type,
				subType: subType === null ? undefined : subType,
				title: title,
				englishTitle: englishTitle,
				year: year,
				dataSource: this.apiName,
				url: 'https://www.bangumi.tv/subject/' + id,
				id: id,
			};

			let model: MediaTypeModel;

			// Use the determined 'type' to instantiate the correct model
			switch (type) {
				case MediaType.Book:
					model = new BookModel({ ...modelData, author: this.extractInfoArray(subjectData.infobox, ['作者']) });
					break;
				case MediaType.Movie:
					model = new MovieModel(modelData);
					break;
				case MediaType.Series:
					model = new SeriesModel(modelData);
					break;
				case MediaType.Game:
					const platformMap: { [key: string]: string } = {
						'pc': 'PC',
						'ps4': 'PS4',
						'playstation 4': 'PS4',
						'ps5': 'PS5',
						'playstation 5': 'PS5',
						'xbox one': 'XB1',
						'xbox series x': 'XSX',
						'xbox series s': 'XSS',
						'xbox series x/s': 'XSX/S',
						'nintendo switch': 'NS',
						'switch': 'NS',
						'ios': 'iOS',
						'android': 'Android',
						'nintendo switch 2': 'NS2',
					};
					
					const rawPlatforms = this.extractInfoArray(subjectData.infobox, ['平台']);
					const mappedPlatforms = rawPlatforms.map((s: string) => {
						const lowerPlatform = s.toLowerCase().trim();
						return platformMap[lowerPlatform] || s; // Use original if no mapping found
					});
					
					model = new GameModel({ 
						...modelData, 
						apiTags: apiTags,
						genres: genres,
						onlineRating: rating, // Pass number directly
						publishers: publisher, // Use plural key 'publishers'
						developers: developer, // Use plural key 'developers'
						composer: composer,
						image: imageUrl,
						website: website, 
						description: description,
						platforms: mappedPlatforms,
						director: director,
						producer: producer, 
						supervisor: supervisor, 
						designer: designer, 
						programmer: programmer, 
						soundDirector: soundDirector, 
						writer: writer,
						cast: cast,
						artist: artist,
						personalRating: personalRating,	
						personalTags: personalTags,
						personalStatus: personalStatus,
						released: releasedStatus, // Use calculated status
						releaseDate: releaseDateString, // Use the ISO string
				});
					break;
				case MediaType.MusicRelease:
					model = new MusicReleaseModel({ ...modelData, artist: this.extractInfoArray(subjectData.infobox, ['艺术家', '歌手', '作曲']) });
					break;
				// Add cases for other types like BoardGame if supported by Bangumi
				default:
					throw new Error(`MDB | BangumiAPI | Unrecognized or unsupported media type '${type}' received for ID ${id}.`);
			}

			return model;
		} catch (error) {
			console.error(`MDB | BangumiAPI | Error fetching data for ID ${id}:`, error);
			throw new Error(`MDB | BangumiAPI | Failed to fetch data for ID ${id}. Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private extractStaff(staff: any[] | undefined, roles: string[]): string[] {
		if (!staff) return [];
		
		const names = new Set<string>(); // Use Set to avoid duplicate names
		staff.forEach(member => {
			if (member.jobs?.some((job: string) => roles.includes(job))) {
				names.add(member.name);
			}
		});
		return Array.from(names);
	}

	private mapStatus(bangumiStatusType: string | undefined): string {
		switch (bangumiStatusType) {
			case '1': return 'Plan to Watch'; // wish
			case '2': return 'Completed';    // collect
			case '3': return 'Watching';     // do
			case '4': return 'On Hold';      // on_hold
			case '5': return 'Dropped';      // dropped
			default: return '';           // Unknown or not collected
		}
	}

	private extractInfoArray(infobox: any[] | undefined, targetKeys: string[]): string[] {
		if (!Array.isArray(infobox)) return [];

		const values: string[] = [];

		for (const item of infobox) {
			// Check if the item has a key and if that key is one we're looking for
			if (item && typeof item === 'object' && item.key && targetKeys.includes(item.key)) {
				// Handle different value types
				if (typeof item.value === 'string') {
					// Check if the string contains the enumeration comma
					if (item.value.includes('、')) {
						// Split by the comma, trim whitespace from each part, and filter out empty strings
						const splitValues = item.value.split('、').map((s: string) => s.trim()).filter(Boolean);
						values.push(...splitValues); // Add all split values
					} else {
						// If no comma, just push the single value (trimmed)
						values.push(item.value.trim());
					}
				} else if (Array.isArray(item.value)) {
					// If value is an array (like '平台'), extract 'v' or the item itself if it's a simple string array
					const subValues = item.value.map((subItem: any) => {
						if (typeof subItem === 'object' && subItem.v) {
							return subItem.v;
						} else if (typeof subItem === 'string') {
							return subItem;
						}
						return ''; // Or handle other structures as needed
					}).filter(Boolean); // Filter out empty strings
					if (subValues.length > 0) values.push(...subValues);
				} else if (item.value && typeof item.value === 'object') {
					// Handle cases where value is a simple object (though not seen in example)
					// Maybe stringify or extract specific properties? For now, skip or stringify.
					// values.push(JSON.stringify(item.value)); 
				}
			}
		}

		return values;
	}
}
