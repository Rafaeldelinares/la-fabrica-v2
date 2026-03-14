package main

import "encoding/json"

type WebhookRequest struct {
	Query struct {
		Q       string `json:"q"`
		Depth   int    `json:"depth"`
		Preload bool   `json:"preload"`
	} `json:"query"`
}

type ScraperJobRequest struct {
	Name     string   `json:"name"`
	Keywords []string `json:"keywords"`
	Lang     string   `json:"lang"`
	Depth    int      `json:"depth"`
	MaxTime  int      `json:"max_time"`
}

type ScraperStatusResponse struct {
	ID         string `json:"id"`
	Status     string `json:"status"`
	Total      int    `json:"total"`
	Downloaded int    `json:"downloaded"`
	Links      struct {
		Download string `json:"download"`
	} `json:"links"`
	Error string `json:"error,omitempty"`
}

type ScraperResultItem struct {
	Title            string          `json:"title"`
	ReviewRating     string          `json:"review_rating"`
	ReviewCount      string          `json:"review_count"`
	ReviewsPerRating json.RawMessage `json:"reviews_per_rating"`
	Address          string          `json:"address"`
	Phone            string          `json:"phone"`
	Website          string          `json:"website"`
	Reservations     string          `json:"reservations"`
	Thumbnail        string          `json:"thumbnail"`
	Cid              string          `json:"cid"`
	ImagesCount      string          `json:"images_count"`
	IsOwnerVerified  string          `json:"is_owner_verified"`
}

type FrontendResponse struct {
	Type         string         `json:"type"`
	Data         *FrontendData  `json:"data,omitempty"`
	Message      string         `json:"message,omitempty"`
	Items        []FrontendItem `json:"items,omitempty"`
	Suggestions  []string       `json:"suggestions,omitempty"`
	Cached       bool           `json:"cached"`
	ResponseTime float64        `json:"response_time"`
}

type FrontendData struct {
	Name          string          `json:"name"`
	Rating        float64         `json:"rating"`
	Reviews       int             `json:"reviews"`
	Breakdown     map[string]int  `json:"breakdown"`
	Address       string          `json:"address"`
	Phone         string          `json:"phone"`
	Website       string          `json:"website"`
	BookingURL    string          `json:"booking_url"`
	Image         string          `json:"image"`
	NegativeCount int             `json:"negative_count"`
	Sentiment     []SentimentItem `json:"sentiment"`
	Cid               string          `json:"cid"`
	ImagesCount       int             `json:"images_count"`
	OwnerResponseRate float64         `json:"owner_response_rate"`
	IsOwnerVerified   bool            `json:"is_owner_verified"`
	IsSimulated       bool            `json:"is_simulated"`
}

type FrontendItem struct {
	Name    string  `json:"name"`
	Rating  float64 `json:"rating"`
	Reviews int     `json:"reviews"`
	Address string  `json:"address"`
	Image   string  `json:"image"`
}

type SentimentItem struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
}
