import { hash, compare } from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { dataSource } from '../persistance/dataSource';
import { AuthToken } from '../persistance/entity/AuthToken';
import { User } from '../persistance/entity/User';

/**
 * AuthService performs all tasks related to User authentication
 */
class AuthService {
    //The amount of rounds of salting to use with bcrypt
    private static readonly SALT_ROUNDS = 10;

    private userRepo: Repository<User>;
    private authTokenRepo: Repository<AuthToken>;

    constructor(private dataSource: DataSource) {
        this.userRepo = this.dataSource.getRepository(User);
        this.authTokenRepo = this.dataSource.getRepository(AuthToken);
    }

    /**
     * Authenticate a user given the username and password. If it is a valid combination a new AuthToken will be returned and internally associated to the user
     * The token inside the returned AuthToken must be included in all authenticated requests for that user (as a )
     * @param username The username of the user
     * @param password The password of the user
     * @returns A new AuthToken which contains the token needed for the user to make authenticated requests
     */
    async authenticate(username: string, password: string): Promise<AuthToken | undefined> {
        try {
            //retrieve the user by username and its AuthToken that may or may not exist
            const user = await this.userRepo.findOne({
                relations: ['authToken'],
                where: {username: username}
            });
            if(user == null) {
                return undefined;
            }
            //compare the password to their stored password hash
            const authenticated = await compare(password, user.passwordHash);
            //If the user succesfully authenticated, we need to create and save/update a new AuthToken
            if(authenticated) {
                //create a new authToken for the user
                const authToken = new AuthToken();
                //If they already have an AuthToken saved, we want to overwrite it with our new one
                //so copy over the existing AuthToken.id and TypeORM's save() will perform the partial update
                if(user.authToken) {
                    authToken.id = user.authToken.id;
                }
                //save the new authToken
                await this.authTokenRepo.save(authToken);
                //associate the user and the authToken
                user.authToken = authToken;
                //save the association
                await this.userRepo.save(user);
                //return the AuthToken to the now authenticated user (to be included in all authenticated request headers)
                return authToken;
            }
            return undefined;
        } catch(error) {
            console.error(error);
            return undefined;
        }
    }

    /**
     * Retrieve a User's AuthToken or null if one does not exist, or the username does not exist
     * @param username The username of the user whose AuthToken is to be retrieved
     * @returns The AuthToken for the User with the matching username, or null if the username does not exist or the AuthToken is null
     */
    async getUserAuthToken(username: string): Promise<AuthToken | null> {
        const user = await this.userRepo.findOne({
            relations: ['authToken'],
            where: {username}
        });
        return user == null
            ?  null
            :  user.authToken;
    }

    /**
     * Retrieve a full AuthToken based on it's 'token' field
     * @param token The token value of the AuthToken to be retrieved
     * @returns The AuthToken with the matching 'token' value, or null in none exists
     */
    async getAuthTokenByToken(token: string): Promise<AuthToken | null> {
        return await this.authTokenRepo.findOne({
            where: {token: token}
        });
    }

    /**
     * Determine if an AuthToken is valid or invalid based on its 'expires' field
     * @param authToken The AuthToken to validate
     * @returns If the AuthToken's 'expires' field is in the future return true, otherwise return false
     */
    isAuthTokenValid(authToken: AuthToken): boolean {
        return authToken.expires >= Date.now();
    }

    /**
     * Get a salted hash of a password
     * @param password The password to salt and hash
     * @returns A salted hash of the password
     */
    private async getPasswordHash(password: string) {
        return hash(password, AuthService.SALT_ROUNDS);
    }
}

//Export a single instance of the service. Since the class is not exported this is the only reference the app will use
export const authService = new AuthService(dataSource);