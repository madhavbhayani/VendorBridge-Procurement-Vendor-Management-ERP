package models

type Country struct {
	ID   int16  `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

type State struct {
	ID        int    `json:"id"`
	CountryID int16  `json:"country_id"`
	Code      string `json:"code"`
	Name      string `json:"name"`
}
