import type { Locale } from '.';

export const table: Locale = {
	locale: 'pt-BR',
	title: 'Rollify',

	search: 'Pesquisar',

	error: {
		unknown: 'Ocorreu um erro desconhecido: {{message}}',
		credentials: {
			email_already_used: 'Email já cadastrado',
			invalid_admin_key: 'Chave de mestre inválida',
			invalid_credentials: 'Usuário ou senha inválidos',
			empty_password: 'Senha vazia',
			password_mismatch: 'Senhas não conferem',
			invalid_email: 'Email inválido',
		},
	},

	login: {
		title: 'Entrar',
		password: 'Senha',
		loginButton: 'Entrar',
		register: 'Não possui uma conta? Registrar-se',
	},

	register: {
		title: 'Registrar',
		password: 'Senha',
		confirmPassword: 'Confirmar senha',
		adminKey: 'Chave do mestre',
		adminKeyDisabled: 'A chave do mestre é desativada para o primeiro cadastro de mestre.',
		registerButton: 'Registrar',
		login: 'Já possui uma conta? Entrar',
		registerAsPlayer: 'Você é um jogador? Registrar-se como jogador',
		registerAsAdmin: 'Você é o mestre? Registrar-se como mestre',
	},

	sheet: {
		playerTitle: 'Ficha de Personagem',
		npcTitle: 'Ficha de NPC',
		playerInfoTitle: 'Detalhes Pessoais',
		playerCharacteristicTitle: 'Características',
		playerSkillTitle: 'Perícias',
		playerCombatTitle: 'Combate',
		playerItemTitle: 'Itens',
		playerSpellTitle: 'Magias',
		clearMarkers: 'Limpar Marcadores',
		attributePoints: 'Pontos de {{name}}',

		equipment: {
			name: 'Nome',
			type: 'Tipo',
			damage: 'Dano',
			range: 'Alcance',
			attacks: 'Ataques',
			currentAmmo: 'Mun. atual',
			ammo: 'Mun. max.',
		},
	},
};
