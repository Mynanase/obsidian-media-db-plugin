import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type GameData = ModelToData<GameModel>;

export class GameModel extends MediaTypeModel {
	tags: string[];
	genres: string[];
	onlineRating: number;
	platforms?: string[];
	developers?: string[];
	publishers?: string[];
	composer?: string[];
	image?: string;
	website?: string;
	description?: string;
	released?: boolean;
	releaseDate: string;
	apiTags?: string[];
	director?: string[];
	producer?: string[];
	supervisor?: string[];
	designer?: string[];
	programmer?: string[];
	soundDirector?: string[];
	writer?: string[];
	cast?: string[];
	artist?: string[];

	userData: {
		played: boolean;
		personalRating: number;
		personalStatus?: string;
		personalTags?: string[];
	};

	constructor(obj: Partial<GameData>) {
		super();

		this.tags = [];
		this.genres = [];
		this.onlineRating = 0;
		this.platforms = [];
		this.developers = [];
		this.publishers = [];
		this.composer = [];
		this.image = '';
		this.website = '';
		this.description = '';
		this.released = false;
		this.releaseDate = '';
		this.apiTags = [];
		this.director = [];
		this.producer = [];
		this.supervisor = [];
		this.designer = [];
		this.programmer = [];
		this.soundDirector = [];
		this.writer = [];
		this.cast = [];
		this.artist = [];

		this.userData = {
			played: false,
			personalRating: 0,
			personalStatus: undefined,
			personalTags: undefined,
		};

		migrateObject(this, obj, this);

		if (!obj.hasOwnProperty('userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'game'];
	}

	getMediaType(): MediaType {
		return MediaType.Game;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
